import { getRequestEvent } from '$app/server';

export type D1PreparedStatement = {
	bind: (...values: unknown[]) => D1PreparedStatement;
	first: <T = Record<string, unknown>>(column?: string) => Promise<T | null>;
	all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
	run: () => Promise<unknown>;
};

export type D1Database = {
	prepare: (query: string) => D1PreparedStatement;
	exec: (query: string) => Promise<unknown>;
	batch?: (statements: D1PreparedStatement[]) => Promise<unknown>;
};

type PlatformWithDb = {
	env?: {
		DB?: D1Database;
	};
};

export const getD1Database = (): D1Database | null => {
	try {
		const event = getRequestEvent();
		const platform = event.platform as PlatformWithDb | undefined;
		return platform?.env?.DB ?? null;
	} catch {
		return null;
	}
};

export const requireD1Database = (): D1Database => {
	const db = getD1Database();
	if (!db) {
		throw new Error('Cloudflare D1 binding `DB` is not available in this request context.');
	}
	return db;
};

const D1_SCHEMA_STATEMENTS = [
	`CREATE TABLE IF NOT EXISTS users (
	  user_key TEXT PRIMARY KEY,
	  github_user_id INTEGER,
	  github_login TEXT,
	  created_at TEXT NOT NULL,
	  updated_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS user_settings (
	  user_key TEXT PRIMARY KEY,
	  config_json TEXT NOT NULL,
	  updated_at TEXT NOT NULL,
	  FOREIGN KEY (user_key) REFERENCES users(user_key) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS user_secrets (
	  user_key TEXT NOT NULL,
	  provider_id TEXT NOT NULL,
	  env_key TEXT NOT NULL,
	  encrypted_value TEXT NOT NULL,
	  iv TEXT NOT NULL,
	  tag TEXT NOT NULL,
	  alg TEXT NOT NULL DEFAULT 'aes-256-gcm',
	  key_version TEXT NOT NULL DEFAULT 'v1',
	  updated_at TEXT NOT NULL,
	  PRIMARY KEY (user_key, provider_id, env_key),
	  FOREIGN KEY (user_key) REFERENCES users(user_key) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS user_oauth_tokens (
	  github_user_id INTEGER PRIMARY KEY,
	  github_login TEXT NOT NULL,
	  github_login_norm TEXT NOT NULL,
	  encrypted_token TEXT NOT NULL,
	  iv TEXT NOT NULL,
	  tag TEXT NOT NULL,
	  alg TEXT NOT NULL DEFAULT 'aes-256-gcm',
	  key_version TEXT NOT NULL DEFAULT 'v1',
	  updated_at TEXT NOT NULL
	)`,
	'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_oauth_login_norm ON user_oauth_tokens(github_login_norm)'
] as const;

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

export const ensureD1Schema = async (dbInput?: D1Database | null) => {
	if (schemaReady) return;
	if (schemaPromise) return schemaPromise;
	const db = dbInput ?? getD1Database();
	if (!db) return;
	schemaPromise = (async () => {
		for (const statement of D1_SCHEMA_STATEMENTS) {
			await db.exec(statement);
		}
		schemaReady = true;
	})();
	try {
		await schemaPromise;
	} finally {
		schemaPromise = null;
	}
};
