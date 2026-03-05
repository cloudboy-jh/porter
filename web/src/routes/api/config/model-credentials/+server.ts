import { json } from '@sveltejs/kit';

import { getConfigSecretStatus, updateModelCredentials } from '$lib/server/store';
import type { PorterConfig } from '$lib/server/types';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const status = await getConfigSecretStatus(locals.session.token, {
		githubUserId: locals.session.user.id,
		githubLogin: locals.session.user.login
	});
	return json(status.modelCredentials ?? {});
};

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const payload = (await request.json()) as PorterConfig['modelCredentials'];
	const identity = {
		githubUserId: locals.session.user.id,
		githubLogin: locals.session.user.login
	};
	const updated = await updateModelCredentials(locals.session.token, payload ?? {}, identity);
	const status = await getConfigSecretStatus(locals.session.token, identity);
	return json({
		modelCredentials: status.modelCredentials ?? {},
		selectedModel: updated.selectedModel ?? 'anthropic/claude-sonnet-4'
	});
};
