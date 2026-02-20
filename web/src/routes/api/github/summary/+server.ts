import { json } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import {
	fetchGitHub,
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
		logEvent('warn', 'api.github.summary', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const [userResult, emailsResult, orgsResult, reposResult] = await Promise.allSettled([
			fetchGitHub<{ id: number; login: string; name: string | null; avatar_url: string }>('/user', session.token),
			fetchGitHub<Array<{ email: string; primary: boolean; verified: boolean }>>('/user/emails', session.token),
			fetchGitHub<Array<{ id: number; login: string; avatar_url: string }>>('/user/orgs?per_page=100', session.token),
			listInstallationRepos(session.token)
		]);

		const isRejected = <T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult =>
			result.status === 'rejected';

		if (isRejected(userResult)) {
			throw userResult.reason;
		}

		const user = userResult.value;
		const warnings: string[] = [];
		const emails = isRejected(emailsResult) ? [] : emailsResult.value;
		if (isRejected(emailsResult)) {
			warnings.push('Could not load GitHub email addresses.');
			logEvent('warn', 'api.github.summary', 'emails_load_failed', {
				requestId,
				userId: session.user.id,
				login: session.user.login,
				token: tokenFingerprint(session.token),
				error: serializeError(emailsResult.reason)
			});
		}
		const orgs = isRejected(orgsResult) ? [] : orgsResult.value;
		if (isRejected(orgsResult)) {
			warnings.push('Could not load GitHub organizations.');
			logEvent('warn', 'api.github.summary', 'orgs_load_failed', {
				requestId,
				userId: session.user.id,
				login: session.user.login,
				token: tokenFingerprint(session.token),
				error: serializeError(orgsResult.reason)
			});
		}
		const reposData = isRejected(reposResult)
			? { repositories: [], installations: { total_count: 0, installations: [] as Array<{ id: number }> }, warnings: [] as Array<{ message: string }> }
			: reposResult.value;
		if (isRejected(reposResult)) {
			warnings.push('Could not load installation repositories.');
			logEvent('warn', 'api.github.summary', 'repos_load_failed', {
				requestId,
				userId: session.user.id,
				login: session.user.login,
				token: tokenFingerprint(session.token),
				error: serializeError(reposResult.reason)
			});
		}
		if (reposData.warnings?.length) warnings.push('Some installations could not be queried. Reconnect GitHub to refresh access.');

		logEvent('info', 'api.github.summary', 'loaded', {
			requestId,
			userId: session.user.id,
			login: session.user.login,
			repositoryCount: reposData.repositories.length,
			organizationCount: orgs.length,
			warningCount: warnings.length,
			token: tokenFingerprint(session.token)
		});

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
			repositories: reposData.repositories,
			installations: reposData.installations.installations,
			warnings
		});
	} catch (error) {
		if (isGitHubAuthError(error)) {
			logEvent('warn', 'api.github.summary', 'github_auth_error', {
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
			logEvent('warn', 'api.github.summary', 'github_rate_limit', {
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
			logEvent('warn', 'api.github.summary', 'github_permission_error', {
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
						'GitHub denied account summary access. Reconnect GitHub to refresh permissions and installation access.'
					)
				},
				{ status: 403 }
			);
		}
		logEvent('error', 'api.github.summary', 'load_failed', {
			requestId,
			userId: session.user.id,
			login: session.user.login,
			token: tokenFingerprint(session.token),
			error: serializeError(error)
		});
		return json({ error: 'failed' }, { status: 500 });
	}
};
