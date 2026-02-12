import { redirect } from '@sveltejs/kit';
import { clearSession, getSession, setSession } from '$lib/server/auth';
import { fetchGitHub, isGitHubAuthError } from '$lib/server/github';
import { startTaskWatchdog } from '$lib/server/watchdog';
import type { Handle } from '@sveltejs/kit';

const protectedRoutes = new Set(['/', '/history', '/settings', '/account', '/review']);

const refreshInstallationStatus = async (event: Parameters<Handle>[0]['event']) => {
	const session = event.locals.session;
	if (!session) return false;

	try {
		const installations = await fetchGitHub<{ total_count: number }>('/user/installations', session.token);
		const hasInstallation = installations.total_count > 0;
		if (hasInstallation !== session.hasInstallation) {
			const nextSession = { ...session, hasInstallation };
			setSession(event.cookies, nextSession);
			event.locals.session = nextSession;
		}
		return hasInstallation;
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(event.cookies);
			event.locals.session = null;
			throw redirect(302, '/auth?error=reauth');
		}
		console.error('Failed to refresh GitHub app installation status:', error);
		return false;
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	startTaskWatchdog();
	const session = getSession(event.cookies);
	event.locals.session = session;

	const isProtected =
		protectedRoutes.has(event.url.pathname) || event.url.pathname.startsWith('/review/');
	if (!session && isProtected) {
		throw redirect(302, '/auth');
	}

	if (session && isProtected && !session.hasInstallation) {
		const hasInstallation = await refreshInstallationStatus(event);
		if (!hasInstallation) {
			throw redirect(302, '/auth?error=install_required');
		}
	}

	return resolve(event);
};
