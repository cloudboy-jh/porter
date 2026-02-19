import { json } from '@sveltejs/kit';

import { updateFlyConfig } from '$lib/server/store';
import {
	validateFlyCredentialsWithMode,
	type FlySetupMode,
	type FlyValidationResult
} from '$lib/server/fly';

const normalizeSetupMode = (value?: string): FlySetupMode => (value === 'deploy' ? 'deploy' : 'org');

export const PUT = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const payload = (await request.json()) as {
			flyToken?: string;
			flyAppName?: string;
			validate?: boolean;
			setupMode?: FlySetupMode;
		};
		const setupMode = normalizeSetupMode(payload?.setupMode);
		let updated = await updateFlyConfig(locals.session.token, {
			flyToken: payload?.flyToken ?? '',
			flyAppName: payload?.flyAppName ?? ''
		});

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
				});
			}
		}

		return json({
			flyToken: '',
			flyAppName: updated.flyAppName ?? '',
			validation,
			setupMode
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to save Fly settings.';
		return json({ error: 'failed', message }, { status: 503 });
	}
};
