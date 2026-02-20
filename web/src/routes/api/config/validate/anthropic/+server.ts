import { json } from '@sveltejs/kit';

import { getConfig } from '$lib/server/store';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const config = await getConfig(locals.session.token, {
		githubUserId: locals.session.user.id,
		githubLogin: locals.session.user.login
	});
	const key = config.credentials?.anthropic?.trim();
	if (!key) {
		return json({ ok: false, status: 'missing' }, { status: 400 });
	}
	return json({ ok: true, status: 'ready' });
};
