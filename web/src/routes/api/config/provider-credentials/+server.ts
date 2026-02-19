import { json } from '@sveltejs/kit';

import { getConfigSecretStatus, updateProviderCredentials } from '$lib/server/store';
import type { PorterConfig } from '$lib/server/types';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const status = await getConfigSecretStatus(locals.session.token);
	return json(status.providerCredentials ?? {});
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const payload = (await request.json()) as PorterConfig['providerCredentials'];
	await updateProviderCredentials(locals.session.token, payload ?? {});
	const status = await getConfigSecretStatus(locals.session.token);
	return json(status.providerCredentials ?? {});
};
