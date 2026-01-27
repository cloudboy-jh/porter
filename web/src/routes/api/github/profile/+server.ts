import { json } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import { fetchGitHub, isGitHubAuthError } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	try {
		const user = await fetchGitHub<{ id: number; login: string; name: string | null; avatar_url: string }>(
			'/user',
			session.token
		);
		const emails = await fetchGitHub<Array<{ email: string; primary: boolean; verified: boolean }>>(
			'/user/emails',
			session.token
		);
		const primaryEmail =
			emails.find((email) => email.primary && email.verified)?.email ??
			emails.find((email) => email.verified)?.email ??
			emails[0]?.email ??
			null;

		return json({
			user: {
				id: user.id,
				login: user.login,
				name: user.name,
				avatarUrl: user.avatar_url
			},
			email: primaryEmail
		});
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to load GitHub profile:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};
