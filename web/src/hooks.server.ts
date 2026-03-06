import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { getSession } from '$lib/server/auth';
import { logEvent } from '$lib/server/logging';
import type { Handle } from '@sveltejs/kit';

const protectedRoutes = new Set(['/', '/history', '/settings', '/account', '/review']);

export const handle: Handle = async ({ event, resolve }) => {
	const requestId = randomUUID();
	event.locals.requestId = requestId;
	const session = getSession(event.cookies);
	event.locals.session = session;
	const pathname = event.url.pathname;

	const isProtected = protectedRoutes.has(pathname) || pathname.startsWith('/review/');
	if (!session && isProtected) {
		logEvent('info', 'auth.hook', 'redirect_unauthenticated', {
			requestId,
			path: pathname
		});
		throw redirect(302, '/auth');
	}

	const response = await resolve(event);
	if (pathname === '/auth' || pathname.startsWith('/api/auth')) {
		response.headers.set('cache-control', 'no-store, max-age=0');
		response.headers.set('pragma', 'no-cache');
		response.headers.set('expires', '0');
		response.headers.set('vary', 'Cookie');
	}
	response.headers.set('x-request-id', requestId);
	return response;
};
