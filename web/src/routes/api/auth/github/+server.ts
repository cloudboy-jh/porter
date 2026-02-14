import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';
import { getSession, setOAuthState, setSession } from '$lib/server/auth';
import { resolvePorterInstallationStatus } from '$lib/server/github';
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

export const GET: RequestHandler = async ({ url, cookies }) => {
	const session = getSession(cookies);
	const forceReconnect = url.searchParams.get('force') === '1';
	if (session) {
		if (session.hasInstallation && !forceReconnect) {
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
				if (resolution.status !== 'indeterminate') {
					const nextHasInstallation = resolution.status === 'installed';
					if (nextHasInstallation !== session.hasInstallation) {
						setSession(cookies, { ...session, hasInstallation: nextHasInstallation });
					}
				}
			} catch (error) {
				console.error('Failed to verify Porter installation before auth redirect:', error);
				installStatus = 'indeterminate';
			}
			if (installStatus === 'installed') {
				setSession(cookies, { ...session, hasInstallation: true });
				throw redirect(302, '/');
			}
			if (installStatus === 'indeterminate') {
				throw redirect(302, '/auth?error=install_check_failed');
			}
		}
		if (forceReconnect) {
			const clientId = env.GITHUB_CLIENT_ID;
			if (!clientId) {
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

			throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
		}
		const installUrl = getGitHubAppInstallUrl();
		if (installUrl) {
			throw redirect(302, installUrl);
		}
		throw redirect(302, '/auth?error=install_required');
	}

	const clientId = env.GITHUB_CLIENT_ID;
	if (!clientId) {
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

	throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
};
