import { redirect } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

const protectedRoutes = new Set(['/', '/history', '/settings', '/onboarding']);

export const handle: Handle = async ({ event, resolve }) => {
	const session = getSession(event.cookies);
	event.locals.session = session;

	if (!session && protectedRoutes.has(event.url.pathname)) {
		throw redirect(302, '/auth');
	}

	return resolve(event);
};
