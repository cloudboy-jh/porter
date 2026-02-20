import { json } from '@sveltejs/kit';
import { scanAgentsNow } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';

export const POST = async ({ locals }: { locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.agents.scan', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const agents = await scanAgentsNow(locals.session.token, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		logEvent('info', 'api.agents.scan', 'scanned', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			agentCount: agents.length,
			token: tokenFingerprint(locals.session.token)
		});
		return json(agents);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to scan agents.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.agents.scan', 'scan_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			normalized,
			error: serializeError(error)
		});
		return json(
			{
				error: normalized.error,
				message: normalized.message,
				action: normalized.action,
				actionUrl: normalized.actionUrl
			},
			{ status: normalized.httpStatus }
		);
	}
};
