import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import {
	clearOAuthState,
	getOAuthState,
	setSession
} from '$lib/server/auth';
import { getConfig, updateConfig } from '$lib/server/store';
import { listInstallationRepos } from '$lib/server/github';
import type { RequestHandler } from './$types';

const fetchJson = async <T>(url: string, options: RequestInit): Promise<T> => {
	const response = await fetch(url, options);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}
	return (await response.json()) as T;
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = getOAuthState(cookies);
	clearOAuthState(cookies);

	if (!code || !state || !storedState || state !== storedState) {
		throw redirect(302, '/auth?error=oauth_state');
	}

	const clientId = privateEnv.GITHUB_CLIENT_ID;
	const clientSecret = privateEnv.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw redirect(302, '/auth?error=missing_client');
	}

	const tokenResponse = await fetchJson<{ access_token?: string }>(
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
				code
			})
		}
	);

	if (!tokenResponse.access_token) {
		throw redirect(302, '/auth?error=token');
	}

	const accessToken = tokenResponse.access_token;
	const user = await fetchJson<{ id: number; login: string; name: string | null; avatar_url: string }>(
		'https://api.github.com/user',
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.github+json'
			}
		}
	);

	const primaryEmail = null;

	let hasInstallation = false;
	try {
		const installations = await fetchJson<{ total_count: number }>(
			'https://api.github.com/user/installations',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/vnd.github+json'
				}
			}
		);
		hasInstallation = installations.total_count > 0;
	} catch (error) {
		console.error('GitHub installation fetch failed:', error);
	}

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
			console.error('Auth callback config update failed:', error);
		}
	}

	throw redirect(302, '/');
};
