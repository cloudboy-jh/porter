import { ensureD1Schema, getD1Database } from '$lib/server/d1';
import { decryptSecretValue, encryptSecretValue } from '$lib/server/secret-crypto';

type StoredToken = {
	github_user_id: number;
	github_login: string;
	encrypted_token: string;
	iv: string;
	tag: string;
	updated_at: string;
};

const fallbackStore = new Map<number, StoredToken>();

export const saveUserOAuthToken = async (input: {
	userId: number;
	login: string;
	token: string;
}) => {
	const encrypted = await encryptSecretValue(input.token);
	const now = new Date().toISOString();
	const db = getD1Database();
	if (!db) {
		fallbackStore.set(input.userId, {
			github_user_id: input.userId,
			github_login: input.login,
			encrypted_token: encrypted.encryptedValue,
			iv: encrypted.iv,
			tag: encrypted.tag,
			updated_at: now
		});
		return;
	}
	await ensureD1Schema(db);

	await db
		.prepare(
			`INSERT INTO user_oauth_tokens
			 (github_user_id, github_login, github_login_norm, encrypted_token, iv, tag, alg, key_version, updated_at)
			 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
			 ON CONFLICT(github_user_id) DO UPDATE SET
			   github_login = excluded.github_login,
			   github_login_norm = excluded.github_login_norm,
			   encrypted_token = excluded.encrypted_token,
			   iv = excluded.iv,
			   tag = excluded.tag,
			   alg = excluded.alg,
			   key_version = excluded.key_version,
			   updated_at = excluded.updated_at`
		)
		.bind(
			input.userId,
			input.login,
			input.login.trim().toLowerCase(),
			encrypted.encryptedValue,
			encrypted.iv,
			encrypted.tag,
			encrypted.alg,
			encrypted.keyVersion,
			now
		)
		.run();
};

const decryptTokenRow = async (row: StoredToken | null) => {
	if (!row) return null;
	try {
		return await decryptSecretValue({
			encryptedValue: row.encrypted_token,
			iv: row.iv,
			tag: row.tag
		});
	} catch {
		return null;
	}
};

export const getUserOAuthTokenByWebhookUser = async (input: {
	userId?: number;
	login?: string;
}) => {
	const db = getD1Database();
	if (!db) {
		if (input.userId && fallbackStore.has(input.userId)) {
			return decryptTokenRow(fallbackStore.get(input.userId) ?? null);
		}
		const normalizedLogin = input.login?.trim().toLowerCase();
		if (!normalizedLogin) return null;
		for (const row of fallbackStore.values()) {
			if (row.github_login.trim().toLowerCase() === normalizedLogin) {
				return decryptTokenRow(row);
			}
		}
		return null;
	}
	await ensureD1Schema(db);

	if (input.userId) {
		const row = await db
			.prepare(
				'SELECT github_user_id, github_login, encrypted_token, iv, tag, updated_at FROM user_oauth_tokens WHERE github_user_id = ?1'
			)
			.bind(input.userId)
			.first<StoredToken>();
		const token = await decryptTokenRow(row ?? null);
		if (token) return token;
	}

	const normalizedLogin = input.login?.trim().toLowerCase();
	if (!normalizedLogin) return null;

	const row = await db
		.prepare(
			'SELECT github_user_id, github_login, encrypted_token, iv, tag, updated_at FROM user_oauth_tokens WHERE github_login_norm = ?1'
		)
		.bind(normalizedLogin)
		.first<StoredToken>();

	return decryptTokenRow(row ?? null);
};
