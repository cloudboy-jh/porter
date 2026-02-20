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
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import type { RequestHandler } from './$types';

const reconnectUrl = '/api/auth/github?force=1';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const requestId = locals.requestId;
	const session = locals.session;
	if (!session) {
		logEvent('warn', 'api.github.repositories', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const { repositories, installations, warnings } = await listInstallationRepos(session.token);
		const hasInstallation = installations.total_count > 0;
		logEvent('info', 'api.github.repositories', 'loaded', {
			requestId,
			userId: session.user.id,
			login: session.user.login,
			hasInstallation,
			repositoryCount: repositories.length,
			warningCount: warnings?.length ?? 0,
			token: tokenFingerprint(session.token)
		});
		if (hasInstallation !== session.hasInstallation) {
			setSession(cookies, { ...session, hasInstallation });
		}

		if (!hasInstallation) {
			return json({ repositories: [], hasInstallation });
		}

		return json({ repositories, hasInstallation, warnings: warnings ?? [] });
	} catch (error) {
		if (isGitHubAuthError(error)) {
			logEvent('warn', 'api.github.repositories', 'github_auth_error', {
				requestId,
				userId: session.user.id,
				login: session.user.login,
				token: tokenFingerprint(session.token),
				error: serializeError(error)
			});
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		if (isGitHubRateLimitError(error)) {
			logEvent('warn', 'api.github.repositories', 'github_rate_limit', {
				requestId,
				userId: session.user.id,
				login: session.user.login,
				token: tokenFingerprint(session.token),
				error: serializeError(error)
			});
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
			logEvent('warn', 'api.github.repositories', 'github_permission_error', {
				requestId,
				userId: session.user.id,
				login: session.user.login,
				token: tokenFingerprint(session.token),
				error: serializeError(error)
			});
			return json(
				{
					error: 'insufficient_permissions',
					action: 'reconnect',
					actionUrl: reconnectUrl,
					message: getGitHubErrorMessage(
						error,
						'GitHub denied repository access. Reconnect GitHub to refresh permissions and installation access.'
					)
				},
				{ status: 403 }
			);
		}
		logEvent('error', 'api.github.repositories', 'load_failed', {
			requestId,
			userId: session.user.id,
			login: session.user.login,
			token: tokenFingerprint(session.token),
			error: serializeError(error)
		});
		return json({ error: 'failed' }, { status: 500 });
	}
};
