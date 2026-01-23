import { json } from '@sveltejs/kit';
import { setSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

type GitHubRepo = {
	id: number;
	full_name: string;
	name: string;
	owner: { login: string };
	private: boolean;
	description: string | null;
};

const fetchJson = async <T>(url: string, token: string): Promise<T> => {
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json'
		}
	});
	if (!response.ok) {
		throw new Error(`GitHub request failed: ${response.status}`);
	}
	return (await response.json()) as T;
};

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const installations = await fetchJson<{ total_count: number; installations: { id: number }[] }>(
		'https://api.github.com/user/installations',
		session.token
	);

	const hasInstallation = installations.total_count > 0;
	if (hasInstallation !== session.hasInstallation) {
		setSession(cookies, { ...session, hasInstallation });
	}

	if (!hasInstallation) {
		return json({ repositories: [], hasInstallation });
	}

	const repoMap = new Map<number, GitHubRepo>();
	for (const installation of installations.installations) {
		const result = await fetchJson<{ repositories: GitHubRepo[] }>(
			`https://api.github.com/user/installations/${installation.id}/repositories?per_page=100`,
			session.token
		);
		for (const repo of result.repositories) {
			repoMap.set(repo.id, repo);
		}
	}

	const repositories = Array.from(repoMap.values()).map((repo) => ({
		id: repo.id,
		fullName: repo.full_name,
		name: repo.name,
		owner: repo.owner.login,
		private: repo.private,
		description: repo.description
	}));

	return json({ repositories, hasInstallation });
};
