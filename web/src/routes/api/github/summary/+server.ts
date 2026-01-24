import { json } from '@sveltejs/kit';
import { fetchGitHub, listInstallationRepos } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const [user, emails, orgs, { repositories, installations }] = await Promise.all([
		fetchGitHub<{ id: number; login: string; name: string | null; avatar_url: string }>('/user', session.token),
		fetchGitHub<Array<{ email: string; primary: boolean; verified: boolean }>>('/user/emails', session.token),
		fetchGitHub<Array<{ id: number; login: string; avatar_url: string }>>('/user/orgs?per_page=100', session.token),
		listInstallationRepos(session.token)
	]);

	const primaryEmail =
		emails.find((email) => email.primary && email.verified)?.email ??
		emails.find((email) => email.verified)?.email ??
		emails[0]?.email ??
		null;

	return json({
		user: {
			id: user.id,
			login: user.login,
			name: user.name,
			avatarUrl: user.avatar_url,
			email: primaryEmail
		},
		organizations: orgs.map((org) => ({
			id: org.id,
			login: org.login,
			avatarUrl: org.avatar_url
		})),
		repositories,
		installations: installations.installations
	});
};
