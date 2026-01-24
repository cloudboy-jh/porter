import { json } from '@sveltejs/kit';
import { setSession } from '$lib/server/auth';
import { listInstallationRepos } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const { repositories, installations } = await listInstallationRepos(session.token);
	const hasInstallation = installations.total_count > 0;
	if (hasInstallation !== session.hasInstallation) {
		setSession(cookies, { ...session, hasInstallation });
	}

	if (!hasInstallation) {
		return json({ repositories: [], hasInstallation });
	}

	return json({ repositories, hasInstallation });
};
