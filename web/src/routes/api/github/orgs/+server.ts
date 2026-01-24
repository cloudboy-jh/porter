import { json } from '@sveltejs/kit';
import { fetchGitHub } from '$lib/server/github';
import type { RequestHandler } from './$types';

type GitHubOrg = {
	id: number;
	login: string;
	avatar_url: string;
};

export const GET: RequestHandler = async ({ locals }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const orgs = await fetchGitHub<GitHubOrg[]>('/user/orgs?per_page=100', session.token);
	return json({
		organizations: orgs.map((org) => ({
			id: org.id,
			login: org.login,
			avatarUrl: org.avatar_url
		}))
	});
};
