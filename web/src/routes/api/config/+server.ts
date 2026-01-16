import { json } from '@sveltejs/kit';

import { getConfig, updateConfig } from '$lib/server/store';
import type { PorterConfig } from '$lib/server/types';

export const GET = async () => {
	const config = await getConfig();
	return json(config);
};

export const PUT = async ({ request }: { request: Request }) => {
	const payload = (await request.json()) as PorterConfig;
	const updated = await updateConfig(payload);
	return json(updated);
};
