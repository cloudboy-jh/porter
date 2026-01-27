import { json } from '@sveltejs/kit';
import { clearSession, setSession } from '$lib/server/auth';
import { isGitHubAuthError, listInstallationRepos } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const { repositories, installations } = await listInstallationRepos(session.token);
		const hasInstallation = installations.total_count > 0;
		if (hasInstallation !== session.hasInstallation) {
			setSession(cookies, { ...session, hasInstallation });
		}

		if (!hasInstallation) {
			return json({ repositories: [], hasInstallation });
		}

		return json({ repositories, hasInstallation });
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to load GitHub repositories:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};
