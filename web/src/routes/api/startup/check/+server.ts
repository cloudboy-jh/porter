import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { ensureD1Schema, getD1Database } from '$lib/server/d1';

const requiredEnv = [
	'SESSION_SECRET',
	'WEBHOOK_SECRET',
	'GITHUB_CLIENT_ID',
	'GITHUB_CLIENT_SECRET',
	'GITHUB_APP_ID',
	'GITHUB_APP_PRIVATE_KEY',
	'PUBLIC_APP_URL',
	'PORTER_OAUTH_TOKEN_SECRET'
] as const;

type TableCheck = {
	name: string;
	present: boolean;
	columnsOk: boolean;
	missingColumns: string[];
};

const requiredSchema: Record<string, string[]> = {
	users: ['user_key', 'github_user_id', 'github_login', 'created_at', 'updated_at'],
	user_settings: ['user_key', 'config_json', 'updated_at'],
	user_secrets: [
		'user_key',
		'provider_id',
		'env_key',
		'encrypted_value',
		'iv',
		'tag',
		'alg',
		'key_version',
		'updated_at'
	],
	user_oauth_tokens: [
		'github_user_id',
		'github_login',
		'github_login_norm',
		'encrypted_token',
		'iv',
		'tag',
		'alg',
		'key_version',
		'updated_at'
	]
};

export const GET = async () => {
	const envStatus = Object.fromEntries(requiredEnv.map((name) => [name, Boolean(env[name])])) as Record<
		(string & {}) | (typeof requiredEnv)[number],
		boolean
	>;

	const missingEnv = requiredEnv.filter((name) => !envStatus[name]);
	const db = getD1Database();
	let d1Connected = false;
	let tableChecks: TableCheck[] = [];
	let dbError: string | null = null;

	if (db) {
		try {
			await ensureD1Schema(db);
			await db.prepare('SELECT 1 as ok').first();
			d1Connected = true;
			const requiredTables = Object.keys(requiredSchema);
			const tableResults = await Promise.all(
				requiredTables.map(async (name) => {
					const row = await db
						.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?1")
						.bind(name)
						.first<{ name: string }>();
					if (!row?.name) {
						return {
							name,
							present: false,
							columnsOk: false,
							missingColumns: [...requiredSchema[name]]
						} satisfies TableCheck;
					}

					const columnRows = await db
						.prepare(`PRAGMA table_info(${name})`)
						.all<{ name?: string }>();
					const existingColumns = new Set(
						(columnRows.results ?? []).map((column) => String(column.name ?? '').trim()).filter(Boolean)
					);
					const missingColumns = requiredSchema[name].filter((column) => !existingColumns.has(column));
					return {
						name,
						present: true,
						columnsOk: missingColumns.length === 0,
						missingColumns
					} satisfies TableCheck;
				})
			);
			tableChecks = tableResults;
		} catch (error) {
			dbError = error instanceof Error ? error.message : 'Unknown D1 error';
		}
	}

	const ok =
		missingEnv.length === 0 &&
		d1Connected &&
		tableChecks.every((table) => table.present && table.columnsOk);

	return json({
		ok,
		environment: envStatus,
		missingEnv,
		d1: {
			bindingPresent: Boolean(db),
			connected: d1Connected,
			error: dbError,
			tables: tableChecks
		}
	});
};
