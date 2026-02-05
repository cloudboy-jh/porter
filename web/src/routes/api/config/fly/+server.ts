import { json } from '@sveltejs/kit';

import { updateFlyConfig } from '$lib/server/store';
import { validateFlyCredentials } from '$lib/server/fly';

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const payload = (await request.json()) as { flyToken?: string; flyAppName?: string; validate?: boolean };
	const updated = await updateFlyConfig(locals.session.token, {
		flyToken: payload?.flyToken ?? '',
		flyAppName: payload?.flyAppName ?? ''
	});

	let validation = {
		ok: false,
		status: 'missing',
		message: 'Fly token and app name are required.',
		appCreated: false
	};

	if (payload?.validate) {
		validation = await validateFlyCredentials(updated.flyToken ?? '', updated.flyAppName ?? '');
	}

	return json({
		flyToken: updated.flyToken ?? '',
		flyAppName: updated.flyAppName ?? '',
		validation
	});
};
