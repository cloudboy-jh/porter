import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

export type Session = {
	user: {
		id: number;
		login: string;
		name: string | null;
		avatarUrl: string;
	};
	token: string;
	hasInstallation: boolean;
};

const SESSION_COOKIE = 'porter_session';
const STATE_COOKIE = 'porter_oauth_state';
const SESSION_SECRET = env.SESSION_SECRET ?? 'dev-secret';

const encode = (value: string) => Buffer.from(value).toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString();

const sign = (value: string) =>
	createHmac('sha256', SESSION_SECRET).update(value).digest('hex');

const safeCompare = (a: string, b: string) => {
	const aBuf = Buffer.from(a);
	const bBuf = Buffer.from(b);
	if (aBuf.length !== bBuf.length) return false;
	return timingSafeEqual(aBuf, bBuf);
};

export const getSession = (cookies: Cookies): Session | null => {
	const raw = cookies.get(SESSION_COOKIE);
	if (!raw) return null;
	const [payload, signature] = raw.split('.');
	if (!payload || !signature) return null;
	const expected = sign(payload);
	if (!safeCompare(signature, expected)) return null;
	try {
		return JSON.parse(decode(payload)) as Session;
	} catch {
		return null;
	}
};

export const setSession = (cookies: Cookies, session: Session) => {
	const payload = encode(JSON.stringify(session));
	const signature = sign(payload);
	cookies.set(SESSION_COOKIE, `${payload}.${signature}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7
	});
};

export const clearSession = (cookies: Cookies) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
};

export const setOAuthState = (cookies: Cookies, state: string) => {
	cookies.set(STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: env.NODE_ENV === 'production',
		maxAge: 60 * 10
	});
};

export const getOAuthState = (cookies: Cookies) => cookies.get(STATE_COOKIE);

export const clearOAuthState = (cookies: Cookies) => {
	cookies.delete(STATE_COOKIE, { path: '/' });
};
