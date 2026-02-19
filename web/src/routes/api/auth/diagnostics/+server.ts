import { json } from '@sveltejs/kit';
import { resolvePorterInstallationStatus } from '$lib/server/github';

const REQUIRED_SCOPES = ['read:user', 'user:email', 'read:org', 'repo', 'gist'];

const parseScopes = (value: string | null) =>
	(value ?? '')
		.split(',')
		.map((scope) => scope.trim())
		.filter(Boolean);

export const GET = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
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
	}

	const missingScopes = REQUIRED_SCOPES.filter((scope) => !grantedScopes.includes(scope));

	const installation = await resolvePorterInstallationStatus(locals.session.token, {
		attempts: 2,
		delayMs: 200
	});

	let action: 'ok' | 'reconnect' | 'install_app' | 'check_runtime' = 'ok';
	if (missingScopes.length > 0) action = 'reconnect';
	if (installation.status === 'not_installed') action = 'install_app';
	if (installation.status === 'indeterminate') action = 'check_runtime';

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
