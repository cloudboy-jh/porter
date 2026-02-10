import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';
import { setOAuthState } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) => {
	const clientId = env.GITHUB_CLIENT_ID;
	if (!clientId) {
		throw redirect(302, '/auth?error=missing_client');
	}

	const state = randomUUID();
	setOAuthState(cookies, state);

	const redirectUri =
		env.GITHUB_OAUTH_REDIRECT_URI ?? `${url.origin}/api/auth/github/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		state,
		scope: 'read:user user:email read:org repo gist'
	});

	throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
};
