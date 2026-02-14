import { json } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import { isGitHubAuthError, resolvePorterInstallationStatus } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import type { RequestHandler } from './$types';

type GitHubInstallation = {
	id: number;
	account?: { login?: string; id?: number; avatar_url?: string };
	app_id?: number;
	app_slug?: string;
	target_type?: string;
	created_at?: string;
};

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const requestId = locals.requestId;
	const session = locals.session;
	if (!session) {
		logEvent('warn', 'api.github.installations', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const resolved = await resolvePorterInstallationStatus(session.token, {
			attempts: 2,
			delayMs: 200
		});
		const installations = resolved.installations;
		logEvent('info', 'api.github.installations', 'loaded', {
			requestId,
			status: resolved.status,
			total: installations.total_count,
			reason: resolved.reason ?? null,
			token: tokenFingerprint(session.token)
		});
		return json({
			status: resolved.status,
			reason: resolved.reason ?? null,
			requestId,
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
	} catch (error) {
		if (isGitHubAuthError(error)) {
			logEvent('warn', 'api.github.installations', 'github_auth_error', {
				requestId,
				token: tokenFingerprint(session.token),
				error: serializeError(error)
			});
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		logEvent('error', 'api.github.installations', 'load_failed', {
			requestId,
			token: tokenFingerprint(session.token),
			error: serializeError(error)
		});
		return json({ error: 'failed' }, { status: 500 });
	}
};
