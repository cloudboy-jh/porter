import { json } from '@sveltejs/kit';

import { listAgents } from '$lib/server/store';

export const GET = async () => {
	return json(await listAgents());
};
