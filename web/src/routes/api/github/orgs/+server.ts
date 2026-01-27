import { json } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import { fetchGitHub, isGitHubAuthError } from '$lib/server/github';
import type { RequestHandler } from './$types';

type GitHubOrg = {
	id: number;
	login: string;
	avatar_url: string;
};

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const orgs = await fetchGitHub<GitHubOrg[]>('/user/orgs?per_page=100', session.token);
		return json({
			organizations: orgs.map((org) => ({
				id: org.id,
				login: org.login,
				avatarUrl: org.avatar_url
			}))
		});
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to load GitHub orgs:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};
