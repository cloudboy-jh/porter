import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';
import { getSession, setOAuthState, setSession } from '$lib/server/auth';
import { resolvePorterInstallationStatus } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import type { RequestHandler } from './$types';

const getGitHubAppInstallUrl = () => {
	const explicitUrl =
		env.GITHUB_APP_INSTALL_URL?.trim() ??
		(env as Record<string, string | undefined>).PUBLIC_GITHUB_APP_INSTALL_URL?.trim();
	if (explicitUrl) {
		return explicitUrl;
	}

	const appSlug = env.GITHUB_APP_SLUG?.trim();
	if (!appSlug) {
		return null;
	}

	return `https://github.com/apps/${appSlug}/installations/new`;
};

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const session = getSession(cookies);
	const forceReconnect = url.searchParams.get('force') === '1';
	const requestId = locals.requestId;
	logEvent('info', 'auth.github', 'request_received', {
		requestId,
		forceReconnect,
		hasSession: Boolean(session),
		hasInstallation: session?.hasInstallation ?? null,
		path: url.pathname
	});
	if (session) {
		if (session.hasInstallation && !forceReconnect) {
			logEvent('info', 'auth.github', 'redirect_home_installed', {
				requestId,
				token: tokenFingerprint(session.token)
			});
			throw redirect(302, '/');
		}

		let installStatus: 'installed' | 'not_installed' | 'indeterminate' = 'not_installed';
		if (!forceReconnect) {
			try {
				const resolution = await resolvePorterInstallationStatus(session.token, {
					attempts: 2,
					delayMs: 250
				});
				installStatus = resolution.status;
				logEvent('info', 'auth.github', 'installation_check_result', {
					requestId,
					status: resolution.status,
					reason: resolution.reason ?? null,
					total: resolution.installations.total_count,
					token: tokenFingerprint(session.token)
				});
				if (resolution.status !== 'indeterminate') {
					const nextHasInstallation = resolution.status === 'installed';
					if (nextHasInstallation !== session.hasInstallation) {
						logEvent('info', 'auth.github', 'session_installation_updated', {
							requestId,
							from: session.hasInstallation,
							to: nextHasInstallation,
							token: tokenFingerprint(session.token)
						});
						setSession(cookies, { ...session, hasInstallation: nextHasInstallation });
					}
				}
			} catch (error) {
				logEvent('error', 'auth.github', 'installation_check_failed', {
					requestId,
					token: tokenFingerprint(session.token),
					error: serializeError(error)
				});
				installStatus = 'indeterminate';
			}
			if (installStatus === 'installed') {
				logEvent('info', 'auth.github', 'redirect_home_after_install_check', {
					requestId,
					token: tokenFingerprint(session.token)
				});
				setSession(cookies, { ...session, hasInstallation: true });
				throw redirect(302, '/');
			}
			if (installStatus === 'indeterminate') {
				logEvent('warn', 'auth.github', 'redirect_install_check_failed', {
					requestId,
					token: tokenFingerprint(session.token)
				});
				throw redirect(302, '/auth?error=install_check_failed');
			}
		}
		if (forceReconnect) {
			const clientId = env.GITHUB_CLIENT_ID;
			if (!clientId) {
				logEvent('error', 'auth.github', 'missing_client_id', {
					requestId,
					forceReconnect: true
				});
				throw redirect(302, '/auth?error=missing_client');
			}

			const state = randomUUID();
			setOAuthState(cookies, state);

			const redirectUri =
				env.GITHUB_OAUTH_REDIRECT_URI ?? `${url.origin}/api/auth/github/callback`;

			const params = new URLSearchParams({
				client_id: clientId,
				redirect_uri: redirectUri,
				state,
				scope: 'read:user user:email read:org repo gist',
				prompt: 'consent'
			});
			logEvent('info', 'auth.github', 'redirect_oauth_consent', {
				requestId,
				forceReconnect: true,
				redirectUri
			});

			throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
		}
		const installUrl = getGitHubAppInstallUrl();
		if (installUrl) {
			logEvent('info', 'auth.github', 'redirect_install_url', {
				requestId,
				installUrl,
				token: tokenFingerprint(session.token)
			});
			throw redirect(302, installUrl);
		}
		logEvent('warn', 'auth.github', 'redirect_install_required_without_url', {
			requestId,
			token: tokenFingerprint(session.token)
		});
		throw redirect(302, '/auth?error=install_required');
	}

	const clientId = env.GITHUB_CLIENT_ID;
	if (!clientId) {
		logEvent('error', 'auth.github', 'missing_client_id', {
			requestId,
			forceReconnect: false
		});
		throw redirect(302, '/auth?error=missing_client');
	}

	const state = randomUUID();
	setOAuthState(cookies, state);

	const redirectUri =
		env.GITHUB_OAUTH_REDIRECT_URI ?? `${url.origin}/api/auth/github/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		state,
		scope: 'read:user user:email read:org repo gist'
	});
	logEvent('info', 'auth.github', 'redirect_oauth_start', {
		requestId,
		redirectUri
	});

	throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
};
