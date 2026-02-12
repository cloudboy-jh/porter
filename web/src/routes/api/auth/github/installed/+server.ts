import { redirect } from '@sveltejs/kit';
import { getSession, setSession } from '$lib/server/auth';
import { hasPorterInstallation } from '$lib/server/github';
import { githubCache } from '$lib/server/cache';

export const GET = async ({ cookies }: { cookies: import('@sveltejs/kit').Cookies }) => {
	const session = getSession(cookies);
	if (!session) {
		throw redirect(302, '/auth');
	}

	let hasInstallation = false;
	try {
		hasInstallation = await hasPorterInstallation(session.token);
	} catch (error) {
		console.error('Failed to verify Porter installation after setup redirect:', error);
	}

	const nextSession = { ...session, hasInstallation };
	setSession(cookies, nextSession);

	if (hasInstallation) {
		githubCache.clearPattern(`installations:${session.token.slice(-8)}`);
		throw redirect(302, '/settings?installed=1');
	}

	throw redirect(302, '/auth?error=install_required');
};
