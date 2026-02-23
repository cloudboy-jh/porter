import { json } from '@sveltejs/kit';

import { getConfig } from '$lib/server/store';
import { validateFlyCredentialsWithMode, type FlySetupMode } from '$lib/server/fly';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';

const normalizeSetupMode = (value: string | null): FlySetupMode =>
	value === 'deploy' ? 'deploy' : 'org';

export const GET = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.config.validate_fly', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const setupMode = normalizeSetupMode(url.searchParams.get('mode'));
		const config = await getConfig(locals.session.token, {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		});
		const validation = await validateFlyCredentialsWithMode(config.flyToken ?? '', config.flyAppName ?? '', {
			mode: setupMode
		});
		if (!validation.ok) {
			logEvent('warn', 'api.config.validate_fly', 'validation_failed', {
				requestId,
				userId: locals.session.user.id,
				login: locals.session.user.login,
				token: tokenFingerprint(locals.session.token),
				status: validation.status,
				message: validation.message,
				mode: setupMode
			});
		}
		return json(validation);
	} catch (error) {
		logEvent('error', 'api.config.validate_fly', 'validation_error', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			error: serializeError(error)
		});
		return json({ error: 'failed', message: 'Failed to validate Fly credentials.' }, { status: 500 });
	}
};
