import { json } from '@sveltejs/kit';

import { getProviderCatalog } from '$lib/server/provider-catalog';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const catalog = await getProviderCatalog();
	return json(catalog);
};
