import { json } from '@sveltejs/kit';

import { getAgentStatus } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';

export const GET = async ({ params, locals }: { params: { name: string }; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const agent = await getAgentStatus(locals.session.token, params.name, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		if (!agent) {
			return json({ error: 'agent not found' }, { status: 404 });
		}
		return json(agent);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to load agent status.',
			reconnectUrl: '/api/auth/github?force=1'
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
