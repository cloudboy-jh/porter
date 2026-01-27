import { json } from '@sveltejs/kit';

import { listAgents, updateAgentSettings } from '$lib/server/store';
import type { AgentConfig } from '$lib/types/agent';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	return json(await listAgents(locals.session.token));
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const payload = (await request.json()) as AgentConfig[];
	const updated = await updateAgentSettings(locals.session.token, payload);
	return json(updated);
};
