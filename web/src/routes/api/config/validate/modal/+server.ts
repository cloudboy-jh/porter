import { json } from '@sveltejs/kit';

import { getConfig } from '$lib/server/store';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const config = await getConfig(locals.session.token);
	const tokenId = config.modal?.tokenId?.trim();
	const tokenSecret = config.modal?.tokenSecret?.trim();
	if (!tokenId || !tokenSecret) {
		return json({ ok: false, status: 'missing' }, { status: 400 });
	}
	return json({ ok: true, status: 'ready' });
};
