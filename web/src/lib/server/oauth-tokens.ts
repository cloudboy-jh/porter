import { randomBytes, webcrypto } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { env } from '$env/dynamic/private';

type StoredToken = {
	userId: number;
	login: string;
	encryptedToken: string;
	iv: string;
	tag: string;
	updatedAt: string;
};

const tokenStorePath =
	env.PORTER_OAUTH_TOKEN_STORE_PATH ?? join(tmpdir(), 'porter-oauth-tokens.json');
const tokenSecret = env.PORTER_OAUTH_TOKEN_SECRET ?? env.SESSION_SECRET ?? 'porter-oauth-secret';

const tokenStore = new Map<number, StoredToken>();
let loaded = false;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (value: Uint8Array) => Buffer.from(value).toString('base64');
const fromBase64 = (value: string) => Uint8Array.from(Buffer.from(value, 'base64'));

let cachedKeyPromise: Promise<CryptoKey> | null = null;

const getKey = async () => {
	if (cachedKeyPromise) return cachedKeyPromise;
	cachedKeyPromise = (async () => {
		const secretBytes = encoder.encode(tokenSecret);
		const digest = await webcrypto.subtle.digest('SHA-256', secretBytes);
		return webcrypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
			'encrypt',
			'decrypt'
		]);
	})();
	return cachedKeyPromise;
};

const encrypt = async (value: string) => {
	const key = await getKey();
	const iv = Uint8Array.from(randomBytes(12));
	const encrypted = await webcrypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, tagLength: 128 },
		key,
		encoder.encode(value)
	);
	const encryptedBytes = new Uint8Array(encrypted);
	const tagLength = 16;
	const ciphertext = encryptedBytes.slice(0, -tagLength);
	const tag = encryptedBytes.slice(-tagLength);
	return {
		encryptedToken: toBase64(ciphertext),
		iv: toBase64(iv),
		tag: toBase64(tag)
	};
};

const decrypt = async (input: { encryptedToken: string; iv: string; tag: string }) => {
	const key = await getKey();
	const iv = fromBase64(input.iv);
	const ciphertext = fromBase64(input.encryptedToken);
	const tag = fromBase64(input.tag);
	const combined = new Uint8Array(ciphertext.length + tag.length);
	combined.set(ciphertext, 0);
	combined.set(tag, ciphertext.length);
	const decrypted = await webcrypto.subtle.decrypt(
		{ name: 'AES-GCM', iv, tagLength: 128 },
		key,
		combined
	);
	return decoder.decode(decrypted);
};

const loadTokenStore = async () => {
	if (loaded) return;
	loaded = true;
	try {
		const raw = await fs.readFile(tokenStorePath, 'utf8');
		const parsed = JSON.parse(raw) as StoredToken[];
		for (const item of parsed) {
			tokenStore.set(item.userId, item);
		}
	} catch {
		// ignore missing or malformed store
	}
};

const persistTokenStore = async () => {
	try {
		const serialized = JSON.stringify(Array.from(tokenStore.values()));
		await fs.writeFile(tokenStorePath, serialized, 'utf8');
	} catch (error) {
		console.error('Failed to persist oauth token store:', error);
	}
};

export const saveUserOAuthToken = async (input: {
	userId: number;
	login: string;
	token: string;
}) => {
	await loadTokenStore();
	const encrypted = await encrypt(input.token);
	tokenStore.set(input.userId, {
		userId: input.userId,
		login: input.login.toLowerCase(),
		updatedAt: new Date().toISOString(),
		...encrypted
	});
	await persistTokenStore();
};

export const getUserOAuthTokenByWebhookUser = async (input: {
	userId?: number;
	login?: string;
}) => {
	await loadTokenStore();
	if (input.userId && tokenStore.has(input.userId)) {
		const item = tokenStore.get(input.userId)!;
		return decrypt(item);
	}

	const normalizedLogin = input.login?.trim().toLowerCase();
	if (!normalizedLogin) return null;

	for (const item of tokenStore.values()) {
		if (item.login === normalizedLogin) {
			return decrypt(item);
		}
	}

	return null;
};
