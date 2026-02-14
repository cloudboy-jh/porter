import { redirect } from '@sveltejs/kit';
import { getSession, setSession } from '$lib/server/auth';
import { resolvePorterInstallationStatus } from '$lib/server/github';
import { githubCache } from '$lib/server/cache';

export const GET = async ({ cookies }: { cookies: import('@sveltejs/kit').Cookies }) => {
	const session = getSession(cookies);
	if (!session) {
		throw redirect(302, '/auth');
	}

	let installStatus: 'installed' | 'not_installed' | 'indeterminate' = 'indeterminate';
	try {
		const resolution = await resolvePorterInstallationStatus(session.token, {
			attempts: 4,
			delayMs: 300
		});
		installStatus = resolution.status;
	} catch (error) {
		console.error('Failed to verify Porter installation after setup redirect:', error);
	}

	const hasInstallation =
		installStatus === 'installed' ? true : installStatus === 'not_installed' ? false : session.hasInstallation;

	const nextSession = { ...session, hasInstallation };
	setSession(cookies, nextSession);

	if (hasInstallation) {
		githubCache.clearPattern(`installations:${session.token.slice(-8)}`);
		throw redirect(302, '/settings?installed=1');
	}

	if (installStatus === 'indeterminate') {
		throw redirect(302, '/auth?error=install_check_failed');
	}

	throw redirect(302, '/auth?error=install_required');
};
