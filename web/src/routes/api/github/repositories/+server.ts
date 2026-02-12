import { json } from '@sveltejs/kit';
import { clearSession, setSession } from '$lib/server/auth';
import {
	getGitHubErrorMessage,
	getRateLimitStatus,
	isGitHubAuthError,
	isGitHubPermissionError,
	isGitHubRateLimitError,
	listInstallationRepos
} from '$lib/server/github';
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
		if (isGitHubRateLimitError(error)) {
			const status = getRateLimitStatus();
			const resetDate = new Date(status.reset * 1000);
			const minutesUntil = Math.ceil((status.reset * 1000 - Date.now()) / 60000);
			return json(
				{
					error: 'rate_limit',
					message: `GitHub API rate limit exceeded. Resets in ${Math.max(minutesUntil, 0)} minutes.`,
					resetAt: resetDate.toISOString()
				},
				{ status: 429 }
			);
		}
		if (isGitHubPermissionError(error)) {
			return json(
				{
					error: 'insufficient_permissions',
					message: getGitHubErrorMessage(
						error,
						'GitHub denied repository access. Re-accept app permissions for this installation.'
					)
				},
				{ status: 403 }
			);
		}
		console.error('Failed to load GitHub repositories:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};
