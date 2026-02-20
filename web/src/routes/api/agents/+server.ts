import { json } from '@sveltejs/kit';

import { listAgents, updateAgentSettings } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';
import type { AgentConfig } from '$lib/types/agent';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		return json(
			await listAgents(locals.session.token, {
				githubUserId: locals.session.user.id,
				githubLogin: locals.session.user.login
			})
		);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to load agents.',
			reconnectUrl: '/api/auth/github?force=1'
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
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as AgentConfig[];
		const updated = await updateAgentSettings(locals.session.token, payload, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		return json(updated);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to update agents.',
			reconnectUrl: '/api/auth/github?force=1'
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
