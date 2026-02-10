import { json } from '@sveltejs/kit';

import { getConfig, updateProviderCredentials } from '$lib/server/store';
import type { PorterConfig } from '$lib/server/types';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const config = await getConfig(locals.session.token);
	return json(config.providerCredentials ?? {});
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const payload = (await request.json()) as PorterConfig['providerCredentials'];
	const updated = await updateProviderCredentials(locals.session.token, payload ?? {});
	return json(updated.providerCredentials ?? {});
};
