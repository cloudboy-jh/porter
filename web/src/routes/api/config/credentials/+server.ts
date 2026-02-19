import { json } from '@sveltejs/kit';

import { getConfigSecretStatus, updateCredentials } from '$lib/server/store';
import type { PorterConfig } from '$lib/server/types';

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as PorterConfig['credentials'];
		await updateCredentials(locals.session.token, payload ?? {});
		const status = await getConfigSecretStatus(locals.session.token);
		return json({ ok: true, secretStatus: status });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to save credentials.';
		return json({ error: 'failed', message }, { status: 503 });
	}
};
