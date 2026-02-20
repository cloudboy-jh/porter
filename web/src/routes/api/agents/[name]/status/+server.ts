import { json } from '@sveltejs/kit';

import { getAgentStatus } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';

export const GET = async ({ params, locals }: { params: { name: string }; locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.agents.status', 'unauthorized', { requestId, name: params.name });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const agent = await getAgentStatus(locals.session.token, params.name, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		if (!agent) {
			logEvent('warn', 'api.agents.status', 'not_found', {
				requestId,
				userId: locals.session.user.id,
				login: locals.session.user.login,
				name: params.name
			});
			return json({ error: 'agent not found' }, { status: 404 });
		}
		logEvent('info', 'api.agents.status', 'loaded', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			name: params.name,
			token: tokenFingerprint(locals.session.token)
		});
		return json(agent);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to load agent status.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.agents.status', 'load_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			name: params.name,
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
