import { json } from '@sveltejs/kit';

import { updateCredentials } from '$lib/server/store';
import type { PorterConfig } from '$lib/server/types';

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const payload = (await request.json()) as PorterConfig['credentials'];
	const updated = await updateCredentials(payload ?? {});
	return json(updated.credentials ?? {});
};
