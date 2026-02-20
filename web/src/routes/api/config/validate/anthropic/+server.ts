import { json } from '@sveltejs/kit';

import { getConfig } from '$lib/server/store';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.config.validate_anthropic', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const config = await getConfig(locals.session.token, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		const key = config.credentials?.anthropic?.trim();
		if (!key) {
			logEvent('warn', 'api.config.validate_anthropic', 'missing_key', {
				requestId,
				userId: locals.session.user.id,
				login: locals.session.user.login,
				token: tokenFingerprint(locals.session.token)
			});
			return json({ ok: false, status: 'missing' }, { status: 400 });
		}
		return json({ ok: true, status: 'ready' });
	} catch (error) {
		logEvent('error', 'api.config.validate_anthropic', 'validation_error', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			error: serializeError(error)
		});
		return json({ error: 'failed' }, { status: 500 });
	}
};
