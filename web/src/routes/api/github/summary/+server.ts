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
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const [user, emails, orgs, { repositories, installations }] = await Promise.all([
			fetchGitHub<{ id: number; login: string; name: string | null; avatar_url: string }>('/user', session.token),
			fetchGitHub<Array<{ email: string; primary: boolean; verified: boolean }>>('/user/emails', session.token),
			fetchGitHub<Array<{ id: number; login: string; avatar_url: string }>>(
				'/user/orgs?per_page=100',
				session.token
			),
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
						'GitHub denied account summary access. Re-accept app permissions for this installation.'
					)
				},
				{ status: 403 }
			);
		}
		console.error('Failed to load GitHub summary:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};
