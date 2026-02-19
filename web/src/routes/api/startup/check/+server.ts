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
			const requiredTables = ['users', 'user_settings', 'user_secrets', 'user_oauth_tokens'];
			const tableResults = await Promise.all(
				requiredTables.map(async (name) => {
					const row = await db
						.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?1")
						.bind(name)
						.first<{ name: string }>();
					return { name, present: Boolean(row?.name) } satisfies TableCheck;
				})
			);
			tableChecks = tableResults;
		} catch (error) {
			dbError = error instanceof Error ? error.message : 'Unknown D1 error';
		}
	}

	const ok = missingEnv.length === 0 && d1Connected && tableChecks.every((table) => table.present);

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
