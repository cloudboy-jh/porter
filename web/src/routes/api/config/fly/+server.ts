import { json } from '@sveltejs/kit';

import { updateFlyConfig } from '$lib/server/store';
import { normalizeGitHubError } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import {
	validateFlyCredentialsWithMode,
	type FlySetupMode,
	type FlyValidationResult
} from '$lib/server/fly';

const normalizeSetupMode = (value?: string): FlySetupMode => (value === 'deploy' ? 'deploy' : 'org');

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.config.fly', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as {
			flyToken?: string;
			flyAppName?: string;
			validate?: boolean;
			setupMode?: FlySetupMode;
		};
		const identity = {
			githubUserId: locals.session.user.id,
			githubLogin: locals.session.user.login
		};
		const setupMode = normalizeSetupMode(payload?.setupMode);
		let updated = await updateFlyConfig(locals.session.token, {
			flyToken: payload?.flyToken ?? '',
			flyAppName: payload?.flyAppName ?? ''
		}, identity);

		let validation: FlyValidationResult = {
			ok: false,
			status: 'missing_token',
			message: 'Fly token is required.',
			appCreated: false,
			mode: setupMode
		};

		if (payload?.validate) {
			validation = await validateFlyCredentialsWithMode(updated.flyToken ?? '', updated.flyAppName ?? '', {
				mode: setupMode
			});

			const resolvedAppName = validation.flyAppName?.trim();
			if (resolvedAppName && resolvedAppName !== (updated.flyAppName ?? '')) {
				updated = await updateFlyConfig(locals.session.token, {
					flyToken: updated.flyToken ?? '',
					flyAppName: resolvedAppName
				}, identity);
			}
		}

		return json({
			flyToken: '',
			flyAppName: updated.flyAppName ?? '',
			validation,
			setupMode
		});
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			defaultMessage: 'Failed to save Fly settings. Reconnect GitHub and try again.',
			reconnectUrl: '/api/auth/github?force=1'
		});
		logEvent('error', 'api.config.fly', 'update_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			normalized,
			error: serializeError(error)
		});
		return json(
			{
				error: normalized.error,
				message: normalized.message,
				action: normalized.action,
				actionUrl: normalized.actionUrl
			},
			{ status: normalized.httpStatus === 500 ? 503 : normalized.httpStatus }
		);
	}
};
