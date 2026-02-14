import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSession, setSession } from '$lib/server/auth';
import { resolvePorterInstallationStatus } from '$lib/server/github';
import { githubCache } from '$lib/server/cache';
import { logEvent, serializeError, tokenFingerprint } from '$lib/server/logging';
import type { RequestHandler } from './$types';

const getGitHubAppInstallUrl = () => {
	const explicitUrl =
		env.GITHUB_APP_INSTALL_URL?.trim() ??
		(env as Record<string, string | undefined>).PUBLIC_GITHUB_APP_INSTALL_URL?.trim();
	if (explicitUrl) {
		return explicitUrl;
	}

	const appSlug = env.GITHUB_APP_SLUG?.trim();
	if (!appSlug) {
		return null;
	}

	return `https://github.com/apps/${appSlug}/installations/new`;
};

export const GET: RequestHandler = async ({ cookies, locals }) => {
	const requestId = locals.requestId;
	const session = getSession(cookies);
	if (!session) {
		logEvent('warn', 'auth.github.installed', 'missing_session', {
			requestId
		});
		throw redirect(302, '/auth');
	}

	let installStatus: 'installed' | 'not_installed' | 'indeterminate' = 'indeterminate';
	try {
		const resolution = await resolvePorterInstallationStatus(session.token, {
			attempts: 4,
			delayMs: 300
		});
		installStatus = resolution.status;
		logEvent('info', 'auth.github.installed', 'installation_check_result', {
			requestId,
			status: resolution.status,
			reason: resolution.reason ?? null,
			total: resolution.installations.total_count,
			token: tokenFingerprint(session.token)
		});
	} catch (error) {
		logEvent('error', 'auth.github.installed', 'installation_verification_failed', {
			requestId,
			token: tokenFingerprint(session.token),
			error: serializeError(error)
		});
	}

	const hasInstallation =
		installStatus === 'installed' ? true : installStatus === 'not_installed' ? false : session.hasInstallation;

	const nextSession = { ...session, hasInstallation };
	setSession(cookies, nextSession);
	logEvent('info', 'auth.github.installed', 'session_updated', {
		requestId,
		previousHasInstallation: session.hasInstallation,
		nextHasInstallation: hasInstallation,
		installStatus,
		token: tokenFingerprint(session.token)
	});

	if (hasInstallation) {
		githubCache.clearPattern(`installations:${session.token.slice(-8)}`);
		logEvent('info', 'auth.github.installed', 'redirect_settings_installed', {
			requestId,
			token: tokenFingerprint(session.token)
		});
		throw redirect(302, '/settings?installed=1');
	}

	if (installStatus === 'indeterminate') {
		logEvent('warn', 'auth.github.installed', 'redirect_install_check_failed', {
			requestId,
			token: tokenFingerprint(session.token)
		});
		throw redirect(302, '/auth?error=install_check_failed');
	}

	const installUrl = getGitHubAppInstallUrl();
	if (installUrl) {
		logEvent('info', 'auth.github.installed', 'redirect_install_url', {
			requestId,
			installUrl,
			token: tokenFingerprint(session.token)
		});
		throw redirect(302, installUrl);
	}

	logEvent('warn', 'auth.github.installed', 'redirect_install_required_missing_url', {
		requestId,
		token: tokenFingerprint(session.token)
	});
	throw redirect(302, '/auth?error=install_required');
};
