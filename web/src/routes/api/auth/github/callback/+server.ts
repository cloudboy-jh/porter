import { isRedirect, redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import {
	clearOAuthState,
	getOAuthState,
	setSession
} from '$lib/server/auth';
import { getConfig, updateConfig } from '$lib/server/store';
import { listInstallationRepos, resolvePorterInstallationStatus } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import { saveUserOAuthToken } from '$lib/server/oauth-tokens';
import type { RequestHandler } from './$types';

const fetchJson = async <T>(url: string, options: RequestInit): Promise<T> => {
	const response = await fetch(url, options);
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Request failed: ${response.status} ${url} ${body}`);
	}
	return (await response.json()) as T;
};

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const requestId = locals.requestId;
	try {
		logEvent('info', 'auth.github.callback', 'request_received', {
			requestId,
			path: url.pathname,
			hasCode: Boolean(url.searchParams.get('code')),
			hasState: Boolean(url.searchParams.get('state'))
		});
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const storedState = getOAuthState(cookies);
		clearOAuthState(cookies);

		if (!code || !state || !storedState || state !== storedState) {
			logEvent('warn', 'auth.github.callback', 'oauth_state_mismatch', {
				requestId,
				hasCode: Boolean(code),
				hasState: Boolean(state),
				hasStoredState: Boolean(storedState),
				stateMatches: Boolean(state && storedState && state === storedState)
			});
			throw redirect(302, '/auth?error=oauth_state');
		}

		const clientId = privateEnv.GITHUB_CLIENT_ID;
		const clientSecret = privateEnv.GITHUB_CLIENT_SECRET;
		const redirectUri =
			privateEnv.GITHUB_OAUTH_REDIRECT_URI ?? `${url.origin}/api/auth/github/callback`;

		if (!clientId || !clientSecret) {
			logEvent('error', 'auth.github.callback', 'missing_client_credentials', {
				requestId,
				hasClientId: Boolean(clientId),
				hasClientSecret: Boolean(clientSecret)
			});
			throw redirect(302, '/auth?error=missing_client');
		}

		let tokenResponse: { access_token?: string };
		try {
			tokenResponse = await fetchJson<{ access_token?: string }>(
				'https://github.com/login/oauth/access_token',
				{
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						client_id: clientId,
						client_secret: clientSecret,
						code,
						redirect_uri: redirectUri
					})
				}
			);
		} catch (error) {
			logEvent('error', 'auth.github.callback', 'oauth_token_exchange_failed', {
				requestId,
				error: serializeError(error)
			});
			throw redirect(302, '/auth?error=oauth_token_exchange');
		}

		if (!tokenResponse.access_token) {
			logEvent('error', 'auth.github.callback', 'oauth_token_missing', { requestId });
			throw redirect(302, '/auth?error=token');
		}

		const accessToken = tokenResponse.access_token;
		let user: { id: number; login: string; name: string | null; avatar_url: string };
		try {
			user = await fetchJson<{ id: number; login: string; name: string | null; avatar_url: string }>(
				'https://api.github.com/user',
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/vnd.github+json',
						'User-Agent': 'porter-app'
					}
				}
			);
		} catch (error) {
			logEvent('error', 'auth.github.callback', 'oauth_user_fetch_failed', {
				requestId,
				token: tokenFingerprint(accessToken),
				error: serializeError(error)
			});
			throw redirect(302, '/auth?error=oauth_user');
		}

		const primaryEmail = null;

		try {
			await saveUserOAuthToken({
				userId: user.id,
				login: user.login,
				token: accessToken
			});
		} catch (error) {
			logEvent('warn', 'auth.github.callback', 'oauth_token_persist_failed', {
				requestId,
				userId: user.id,
				login: user.login,
				error: serializeError(error)
			});
		}

		let installStatus: 'installed' | 'not_installed' | 'indeterminate' = 'indeterminate';
		try {
			const resolution = await resolvePorterInstallationStatus(accessToken, {
				attempts: 2,
				delayMs: 250
			});
			installStatus = resolution.status;
			logEvent('info', 'auth.github.callback', 'installation_check_result', {
				requestId,
				status: resolution.status,
				reason: resolution.reason ?? null,
				total: resolution.installations.total_count,
				token: tokenFingerprint(accessToken)
			});
		} catch (error) {
			logEvent('error', 'auth.github.callback', 'installation_status_check_failed', {
				requestId,
				token: tokenFingerprint(accessToken),
				error: serializeError(error)
			});
		}

		const hasInstallation = installStatus === 'installed';

		setSession(cookies, {
			user: {
				id: user.id,
				login: user.login,
				name: user.name,
				avatarUrl: user.avatar_url,
				email: primaryEmail
			},
			token: accessToken,
			hasInstallation
		});
		logEvent('info', 'auth.github.callback', 'session_set', {
			requestId,
			userId: user.id,
			login: user.login,
			hasInstallation,
			installStatus
		});

		if (hasInstallation) {
			try {
				const config = await getConfig(accessToken);
				if (!config.onboarding?.completed) {
					const { repositories } = await listInstallationRepos(accessToken);
					const selectedRepos = repositories.map((repo) => ({
						id: repo.id,
						fullName: repo.fullName,
						owner: repo.owner,
						name: repo.name,
						private: repo.private
					}));
					await updateConfig(accessToken, {
						...config,
						onboarding: {
							completed: true,
							selectedRepos,
							enabledAgents: config.onboarding?.enabledAgents?.length
								? config.onboarding.enabledAgents
								: ['opencode', 'claude-code']
						}
					});
				}
			} catch (error) {
				logEvent('warn', 'auth.github.callback', 'post_auth_config_update_failed', {
					requestId,
					userId: user.id,
					login: user.login,
					error: serializeError(error)
				});
			}
		}

		if (!hasInstallation) {
			if (installStatus === 'indeterminate') {
				logEvent('warn', 'auth.github.callback', 'redirect_install_check_failed', {
					requestId,
					userId: user.id,
					login: user.login,
					token: tokenFingerprint(accessToken)
				});
				throw redirect(302, '/auth?error=install_check_failed');
			}
			logEvent('info', 'auth.github.callback', 'redirect_install_required', {
				requestId,
				userId: user.id,
				login: user.login,
				token: tokenFingerprint(accessToken)
			});
			throw redirect(302, '/auth?error=install_required');
		}

		logEvent('info', 'auth.github.callback', 'redirect_home_success', {
			requestId,
			userId: user.id,
			login: user.login
		});
		throw redirect(302, '/');
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}
		logEvent('error', 'auth.github.callback', 'unhandled_callback_error', {
			requestId,
			error: serializeError(error)
		});
		throw redirect(302, '/auth?error=oauth_callback');
	}
};
