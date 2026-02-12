import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';
import { getSession, setOAuthState, setSession } from '$lib/server/auth';
import { hasPorterInstallation } from '$lib/server/github';
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
		let refreshedHasInstallation = session.hasInstallation;
		if (!forceReconnect) {
			try {
				refreshedHasInstallation = await hasPorterInstallation(session.token);
				if (refreshedHasInstallation !== session.hasInstallation) {
					setSession(cookies, { ...session, hasInstallation: refreshedHasInstallation });
				}
			} catch (error) {
				console.error('Failed to verify Porter installation before auth redirect:', error);
			}
			if (refreshedHasInstallation) {
				throw redirect(302, '/');
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
