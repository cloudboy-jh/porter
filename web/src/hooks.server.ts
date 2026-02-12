import { redirect } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { startTaskWatchdog } from '$lib/server/watchdog';
import type { Handle } from '@sveltejs/kit';

const protectedRoutes = new Set(['/', '/history', '/settings', '/account', '/review']);

export const handle: Handle = async ({ event, resolve }) => {
	startTaskWatchdog();
	const session = getSession(event.cookies);
	event.locals.session = session;

	const isProtected =
		protectedRoutes.has(event.url.pathname) || event.url.pathname.startsWith('/review/');
	if (!session && isProtected) {
		throw redirect(302, '/auth');
	}

	return resolve(event);
};
