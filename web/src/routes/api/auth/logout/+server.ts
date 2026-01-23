import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
	clearSession(cookies);
	throw redirect(302, '/auth');
};
