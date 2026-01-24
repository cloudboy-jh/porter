import { json } from '@sveltejs/kit';

import { getAgentStatus } from '$lib/server/store';

export const GET = async ({ params }: { params: { name: string } }) => {
	const agent = await getAgentStatus(params.name);
	if (!agent) {
		return json({ error: 'agent not found' }, { status: 404 });
	}
	return json(agent);
};
