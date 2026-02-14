import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { getSession } from '$lib/server/auth';
import { logEvent } from '$lib/server/logging';
import { startTaskWatchdog } from '$lib/server/watchdog';
import type { Handle } from '@sveltejs/kit';

const protectedRoutes = new Set(['/', '/history', '/settings', '/account', '/review']);

export const handle: Handle = async ({ event, resolve }) => {
	startTaskWatchdog();
	const requestId = randomUUID();
	event.locals.requestId = requestId;
	const session = getSession(event.cookies);
	event.locals.session = session;

	const isProtected =
		protectedRoutes.has(event.url.pathname) || event.url.pathname.startsWith('/review/');
	if (!session && isProtected) {
		logEvent('info', 'auth.hook', 'redirect_unauthenticated', {
			requestId,
			path: event.url.pathname
		});
		throw redirect(302, '/auth');
	}

	const response = await resolve(event);
	response.headers.set('x-request-id', requestId);
	return response;
};
