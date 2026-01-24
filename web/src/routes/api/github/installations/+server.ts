import { json } from '@sveltejs/kit';
import { fetchGitHub } from '$lib/server/github';
import type { RequestHandler } from './$types';

type GitHubInstallation = {
	id: number;
	account?: { login?: string; id?: number; avatar_url?: string };
	app_id?: number;
	app_slug?: string;
	target_type?: string;
	created_at?: string;
};

export const GET: RequestHandler = async ({ locals }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const installations = await fetchGitHub<{ total_count: number; installations: GitHubInstallation[] }>(
		'/user/installations',
		session.token
	);
	return json({
		total: installations.total_count,
		installations: installations.installations.map((installation) => ({
			id: installation.id,
			appId: installation.app_id,
			appSlug: installation.app_slug,
			targetType: installation.target_type,
			createdAt: installation.created_at,
			account: installation.account
				? {
					id: installation.account.id ?? null,
					login: installation.account.login ?? null,
					avatarUrl: installation.account.avatar_url ?? null
				}
				: null
		}))
	});
};
