import { json } from '@sveltejs/kit';

import { getConfig, updateConfig } from '$lib/server/store';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const identity = {
		githubUserId: locals.session.user.id,
		githubLogin: locals.session.user.login
	};
	const config = await getConfig(locals.session.token, identity);
	return json({ selectedModel: config.selectedModel ?? 'anthropic/claude-sonnet-4' });
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const payload = (await request.json()) as { selectedModel?: string };
	const nextModel = payload.selectedModel?.trim();
	if (!nextModel) {
		return json({ error: 'selectedModel is required' }, { status: 400 });
	}
	const identity = {
		githubUserId: locals.session.user.id,
		githubLogin: locals.session.user.login
	};
	const current = await getConfig(locals.session.token, identity);
	const updated = await updateConfig(
		locals.session.token,
		{ ...current, selectedModel: nextModel },
		identity
	);
	return json({ selectedModel: updated.selectedModel ?? nextModel });
};
