import { json } from '@sveltejs/kit';

import { listAgents, updateAgentSettings } from '$lib/server/store';
import type { AgentConfig } from '$lib/types/agent';

export const GET = async () => {
	return json(await listAgents());
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const payload = (await request.json()) as AgentConfig[];
	const updated = await updateAgentSettings(payload);
	return json(updated);
};
