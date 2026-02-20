import { json } from '@sveltejs/kit';

import { listAgents, updateAgentSettings } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import type { AgentConfig } from '$lib/types/agent';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.agents', 'unauthorized_get', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const agents = await listAgents(locals.session.token, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		logEvent('info', 'api.agents', 'loaded', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			agentCount: agents.length,
			token: tokenFingerprint(locals.session.token)
		});
		return json(agents);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to load agents.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.agents', 'load_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			normalized,
			error: serializeError(error)
		});
		const payload = {
			error: normalized.error,
			message: normalized.message,
			action: normalized.action,
			actionUrl: normalized.actionUrl
		};
		return json(payload, { status: normalized.httpStatus });
	}
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.agents', 'unauthorized_put', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as AgentConfig[];
		const updated = await updateAgentSettings(locals.session.token, payload, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		logEvent('info', 'api.agents', 'updated', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			agentCount: updated.length,
			token: tokenFingerprint(locals.session.token)
		});
		return json(updated);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to update agents.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.agents', 'update_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			normalized,
			error: serializeError(error)
		});
		const payload = {
			error: normalized.error,
			message: normalized.message,
			action: normalized.action,
			actionUrl: normalized.actionUrl
		};
		return json(payload, { status: normalized.httpStatus });
	}
};
