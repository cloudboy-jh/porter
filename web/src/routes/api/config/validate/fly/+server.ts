import { json } from '@sveltejs/kit';

import { getConfig } from '$lib/server/store';
import { validateFlyCredentials } from '$lib/server/fly';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const config = await getConfig(locals.session.token);
	const validation = await validateFlyCredentials(config.flyToken ?? '', config.flyAppName ?? '');
	return json(validation, { status: validation.ok ? 200 : 400 });
};
