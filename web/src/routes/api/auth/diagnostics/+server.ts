import { json } from '@sveltejs/kit';
import { resolvePorterInstallationStatus } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';

export const GET = async ({ locals }: { locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.auth.diagnostics', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	let installation: {
		status: 'installed' | 'not_installed' | 'indeterminate';
		installations: { total_count: number };
		reason?: string;
	};
	try {
		installation = await resolvePorterInstallationStatus(locals.session.token, {
			attempts: 2,
			delayMs: 200
		});
	} catch (error) {
		logEvent('error', 'api.auth.diagnostics', 'installation_check_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			error: serializeError(error)
		});
		installation = {
			status: 'indeterminate',
			installations: { total_count: 0 },
			reason: 'diagnostic_installation_check_failed'
		};
	}

	let action: 'ok' | 'install_app' | 'check_runtime' = 'ok';
	if (installation.status === 'not_installed') action = 'install_app';
	if (installation.status === 'indeterminate') action = 'check_runtime';

	logEvent('info', 'api.auth.diagnostics', 'evaluated', {
		requestId,
		userId: locals.session.user.id,
		login: locals.session.user.login,
		token: tokenFingerprint(locals.session.token),
		installationStatus: installation.status,
		action,
		reason: installation.reason ?? null
	});

	return json({
		ok: action === 'ok',
		installationStatus: installation.status,
		installationCount: installation.installations.total_count,
		action,
		reason: installation.reason ?? null
	});
};
