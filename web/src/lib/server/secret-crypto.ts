import { randomBytes, webcrypto, createHmac } from 'crypto';
import { env } from '$env/dynamic/private';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const DEFAULT_ALG = 'aes-256-gcm';
const DEFAULT_KEY_VERSION = 'v1';
const rootSecret =
	env.PORTER_SECRET_ENCRYPTION_KEY ?? env.PORTER_OAUTH_TOKEN_SECRET ?? env.SESSION_SECRET ?? 'porter-dev-secret';

const toBase64 = (value: Uint8Array) => Buffer.from(value).toString('base64');
const fromBase64 = (value: string) => Uint8Array.from(Buffer.from(value, 'base64'));

let cachedKeyPromise: Promise<CryptoKey> | null = null;

const getKey = async () => {
	if (cachedKeyPromise) return cachedKeyPromise;
	cachedKeyPromise = (async () => {
		const digest = await webcrypto.subtle.digest('SHA-256', encoder.encode(rootSecret));
		return webcrypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
			'encrypt',
			'decrypt'
		]);
	})();
	return cachedKeyPromise;
};

export const deriveUserKey = (token: string) => {
	return createHmac('sha256', rootSecret).update(token).digest('hex');
};

export const encryptSecretValue = async (value: string) => {
	const key = await getKey();
	const iv = Uint8Array.from(randomBytes(12));
	const encrypted = await webcrypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, tagLength: 128 },
		key,
		encoder.encode(value)
	);
	const bytes = new Uint8Array(encrypted);
	const tagLength = 16;
	const ciphertext = bytes.slice(0, -tagLength);
	const tag = bytes.slice(-tagLength);
	return {
		encryptedValue: toBase64(ciphertext),
		iv: toBase64(iv),
		tag: toBase64(tag),
		alg: DEFAULT_ALG,
		keyVersion: DEFAULT_KEY_VERSION
	};
};

export const decryptSecretValue = async (input: {
	encryptedValue: string;
	iv: string;
	tag: string;
}) => {
	const key = await getKey();
	const iv = fromBase64(input.iv);
	const ciphertext = fromBase64(input.encryptedValue);
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
