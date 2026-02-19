import { json } from '@sveltejs/kit';

import { getConfig, getConfigSecretStatus, getConfigWarnings, updateConfig } from '$lib/server/store';
import { getConfigGistUrl } from '$lib/server/gist';
import type { PorterConfig } from '$lib/server/types';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const config = await getConfig(locals.session.token);
	const secretStatus = await getConfigSecretStatus(locals.session.token);
	const warnings = getConfigWarnings(locals.session.token);
	const gistUrl = await getConfigGistUrl(locals.session.token);
	return json({
		...config,
		flyToken: '',
		credentials: {},
		providerCredentials: {},
		secretStatus,
		warnings,
		gistUrl
	});
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as PorterConfig;
		const updated = await updateConfig(locals.session.token, payload);
		return json(updated);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to save config.';
		return json({ error: 'failed', message }, { status: 503 });
	}
};
