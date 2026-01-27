import { json } from '@sveltejs/kit';

import { getAgentStatus } from '$lib/server/store';

export const GET = async ({ params, locals }: { params: { name: string }; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const agent = await getAgentStatus(locals.session.token, params.name);
	if (!agent) {
		return json({ error: 'agent not found' }, { status: 404 });
	}
	return json(agent);
};
