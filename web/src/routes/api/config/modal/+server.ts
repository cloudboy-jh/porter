import { json } from '@sveltejs/kit';

import { updateModalCredentials } from '$lib/server/store';
import type { PorterConfig } from '$lib/server/types';

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const payload = (await request.json()) as PorterConfig['modal'];
	const updated = await updateModalCredentials(locals.session.token, payload ?? {});
	return json(updated.modal ?? {});
};
