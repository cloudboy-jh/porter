import { json } from '@sveltejs/kit';
import { resolvePorterInstallationStatus } from '$lib/server/github';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';

const REQUIRED_SCOPES = ['read:user', 'user:email', 'read:org', 'repo', 'gist'];

const parseScopes = (value: string | null) =>
	(value ?? '')
		.split(',')
		.map((scope) => scope.trim())
		.filter(Boolean);

export const GET = async ({ locals }: { locals: App.Locals }) => {
	const requestId = locals.requestId;
	if (!locals.session) {
		logEvent('warn', 'api.auth.diagnostics', 'unauthorized', { requestId });
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	let grantedScopes: string[] = [];
	let scopeError: string | null = null;
	try {
		const response = await fetch('https://api.github.com/user', {
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${locals.session.token}`,
				'User-Agent': 'porter-app'
			}
		});
		if (!response.ok) {
			scopeError = `GitHub scope check failed: ${response.status}`;
		} else {
			grantedScopes = parseScopes(response.headers.get('x-oauth-scopes'));
		}
	} catch (error) {
		scopeError = error instanceof Error ? error.message : 'Unknown scope check failure';
		logEvent('warn', 'api.auth.diagnostics', 'scope_check_failed', {
			requestId,
			userId: locals.session.user.id,
			login: locals.session.user.login,
			token: tokenFingerprint(locals.session.token),
			error: serializeError(error)
		});
	}

	const missingScopes = REQUIRED_SCOPES.filter((scope) => !grantedScopes.includes(scope));

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

	let action: 'ok' | 'reconnect' | 'install_app' | 'check_runtime' = 'ok';
	if (missingScopes.length > 0) action = 'reconnect';
	if (installation.status === 'not_installed') action = 'install_app';
	if (installation.status === 'indeterminate') action = 'check_runtime';

	logEvent('info', 'api.auth.diagnostics', 'evaluated', {
		requestId,
		userId: locals.session.user.id,
		login: locals.session.user.login,
		token: tokenFingerprint(locals.session.token),
		grantedScopes,
		missingScopes,
		scopeError,
		installationStatus: installation.status,
		action,
		reason: installation.reason ?? null
	});

	return json({
		ok: action === 'ok',
		requiredScopes: REQUIRED_SCOPES,
		grantedScopes,
		missingScopes,
		scopeError,
		installationStatus: installation.status,
		installationCount: installation.installations.total_count,
		action,
		reason: installation.reason ?? null
	});
};
