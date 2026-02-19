import { randomUUID } from 'crypto';
import { loadConfigFromGist, saveConfigToGist } from './gist';
import type { PorterConfig, Task, TaskLog, TaskStatus } from './types';
import type { AgentConfig } from '$lib/types/agent';
import { AGENT_REGISTRY } from '$lib/constants/agent-registry';
import { ensureD1Schema, getD1Database } from './d1';
import { decryptSecretValue, deriveUserKey, encryptSecretValue } from './secret-crypto';

let tasks: Task[] = [];

const baseConfig: PorterConfig = {
	version: '1.0.0',
	executionMode: 'cloud',
	flyToken: '',
	agents: {
		opencode: {
			enabled: true,
			priority: 'normal'
		},
		'claude-code': {
			enabled: true,
			priority: 'normal'
		},
		amp: {
			enabled: false,
			priority: 'normal'
		}
	},
	credentials: {},
	providerCredentials: {},
	settings: {
		maxRetries: 3,
		taskTimeout: 90,
		pollInterval: 10
	},
	onboarding: {
		completed: false,
		selectedRepos: [],
		enabledAgents: ['opencode', 'claude-code']
	}
};

const configCache = new Map<string, PorterConfig>();
const configLoaded = new Set<string>();
const configWarnings = new Map<string, string[]>();

const normalizeCredential = (value?: string) => {
	if (!value) return undefined;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : undefined;
};

const normalizeCredentials = (credentials?: PorterConfig['credentials']) => {
	const normalized: PorterConfig['credentials'] = {};
	const entries: Array<keyof NonNullable<PorterConfig['credentials']>> = ['anthropic', 'openai', 'amp'];
	for (const key of entries) {
		const value = normalizeCredential(credentials?.[key]);
		if (value) {
			normalized[key] = value;
		}
	}
	return normalized;
};

const normalizeProviderCredentials = (providerCredentials?: PorterConfig['providerCredentials']) => {
	const normalized: Record<string, Record<string, string>> = {};
	for (const [providerId, values] of Object.entries(providerCredentials ?? {})) {
		const nextValues: Record<string, string> = {};
		for (const [envKey, rawValue] of Object.entries(values ?? {})) {
			const value = normalizeCredential(rawValue);
			if (value) {
				nextValues[envKey] = value;
			}
		}
		if (Object.keys(nextValues).length > 0) {
			normalized[providerId] = nextValues;
		}
	}
	return normalized;
};

const mapLegacyCredentialsToProviders = (credentials?: PorterConfig['credentials']) => {
	const mapped: Record<string, Record<string, string>> = {};
	const anthropic = normalizeCredential(credentials?.anthropic);
	if (anthropic) {
		mapped.anthropic = { ANTHROPIC_API_KEY: anthropic };
	}
	const openai = normalizeCredential(credentials?.openai);
	if (openai) {
		mapped.openai = { OPENAI_API_KEY: openai };
	}
	const amp = normalizeCredential(credentials?.amp);
	if (amp) {
		mapped.amp = { AMP_API_KEY: amp };
	}
	return mapped;
};

const mapProvidersToLegacyCredentials = (
	providerCredentials?: PorterConfig['providerCredentials'],
	fallback?: PorterConfig['credentials']
) => {
	const legacy = normalizeCredentials(fallback);
	const anthropic = normalizeCredential(providerCredentials?.anthropic?.ANTHROPIC_API_KEY);
	const openai = normalizeCredential(providerCredentials?.openai?.OPENAI_API_KEY);
	const amp = normalizeCredential(providerCredentials?.amp?.AMP_API_KEY);
	if (anthropic) legacy.anthropic = anthropic;
	else delete legacy.anthropic;
	if (openai) legacy.openai = openai;
	else delete legacy.openai;
	if (amp) legacy.amp = amp;
	else delete legacy.amp;
	return legacy;
};

const normalizeFlyToken = (token?: string) => normalizeCredential(token) ?? '';
const normalizeFlyAppName = (appName?: string) => normalizeCredential(appName) ?? '';

const normalizeAgentConfig = (agents: PorterConfig['agents']) => {
	const next = { ...agents };
	if (next.claude && !next['claude-code']) {
		next['claude-code'] = next.claude;
		delete next.claude;
	}
	for (const entry of AGENT_REGISTRY) {
		if (!next[entry.id]) {
			next[entry.id] = { enabled: false, priority: 'normal' };
		}
	}
	return next;
};

const setConfigWarning = (token: string, message?: string) => {
	if (!message) {
		configWarnings.delete(token);
		return;
	}
	const existing = configWarnings.get(token) ?? [];
	configWarnings.set(token, Array.from(new Set([...existing, message])));
};

type D1SettingRow = {
	config_json: string;
};

type D1SecretRow = {
	provider_id: string;
	env_key: string;
	encrypted_value: string;
	iv: string;
	tag: string;
};

const sanitizeConfigForSettingsTable = (config: PorterConfig): PorterConfig => ({
	...config,
	credentials: {},
	providerCredentials: {}
});

const ensureUserRow = async (token: string) => {
	const db = getD1Database();
	if (!db) return null;
	await ensureD1Schema(db);
	const now = new Date().toISOString();
	const userKey = deriveUserKey(token);
	await db
		.prepare(
			`INSERT INTO users (user_key, created_at, updated_at)
			 VALUES (?1, ?2, ?2)
			 ON CONFLICT(user_key) DO UPDATE SET updated_at = excluded.updated_at`
		)
		.bind(userKey, now)
		.run();
	return { db, userKey };
};

const loadConfigFromD1 = async (token: string): Promise<PorterConfig | null> => {
	const db = getD1Database();
	if (!db) return null;
	await ensureD1Schema(db);
	const userKey = deriveUserKey(token);
	const settingRow = await db
		.prepare('SELECT config_json FROM user_settings WHERE user_key = ?1')
		.bind(userKey)
		.first<D1SettingRow>();
	if (!settingRow?.config_json) {
		return null;
	}

	const parsed = JSON.parse(settingRow.config_json) as PorterConfig;
	const secretsRows = await db
		.prepare(
			'SELECT provider_id, env_key, encrypted_value, iv, tag FROM user_secrets WHERE user_key = ?1'
		)
		.bind(userKey)
		.all<D1SecretRow>();

	const providerCredentials: PorterConfig['providerCredentials'] = {};
	for (const row of secretsRows.results ?? []) {
		try {
			const decrypted = await decryptSecretValue({
				encryptedValue: row.encrypted_value,
				iv: row.iv,
				tag: row.tag
			});
			if (!providerCredentials[row.provider_id]) {
				providerCredentials[row.provider_id] = {};
			}
			providerCredentials[row.provider_id][row.env_key] = decrypted;
		} catch {
			// skip malformed secret rows
		}
	}

	const merged = {
		...parsed,
		providerCredentials
	};
	merged.credentials = mapProvidersToLegacyCredentials(providerCredentials, parsed.credentials);
	return merged;
};

const saveConfigToD1 = async (token: string, config: PorterConfig): Promise<boolean> => {
	const userCtx = await ensureUserRow(token);
	if (!userCtx) return false;
	const { db, userKey } = userCtx;
	const now = new Date().toISOString();
	const configForSettings = sanitizeConfigForSettingsTable(config);

	await db
		.prepare(
			`INSERT INTO user_settings (user_key, config_json, updated_at)
			 VALUES (?1, ?2, ?3)
			 ON CONFLICT(user_key) DO UPDATE SET
			   config_json = excluded.config_json,
			   updated_at = excluded.updated_at`
		)
		.bind(userKey, JSON.stringify(configForSettings), now)
		.run();

	await db.prepare('DELETE FROM user_secrets WHERE user_key = ?1').bind(userKey).run();
	for (const [providerId, entries] of Object.entries(config.providerCredentials ?? {})) {
		for (const [envKey, rawValue] of Object.entries(entries)) {
			const value = normalizeCredential(rawValue);
			if (!value) continue;
			const encrypted = await encryptSecretValue(value);
			await db
				.prepare(
					`INSERT INTO user_secrets
					 (user_key, provider_id, env_key, encrypted_value, iv, tag, alg, key_version, updated_at)
					 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
				)
				.bind(
					userKey,
					providerId,
					envKey,
					encrypted.encryptedValue,
					encrypted.iv,
					encrypted.tag,
					encrypted.alg,
					encrypted.keyVersion,
					now
				)
				.run();
		}
	}

	return true;
};

export const getConfigWarnings = (token: string) => configWarnings.get(token) ?? [];

export const getConfigSecretStatus = async (token: string) => {
	const activeConfig = await getConfig(token);
	const statusByProvider: Record<string, Record<string, 'configured' | 'not_configured'>> = {};
	for (const [providerId, values] of Object.entries(activeConfig.providerCredentials ?? {})) {
		statusByProvider[providerId] = {};
		for (const [envKey, value] of Object.entries(values)) {
			statusByProvider[providerId][envKey] = normalizeCredential(value)
				? 'configured'
				: 'not_configured';
		}
	}

	const legacyStatus: Record<'anthropic' | 'openai' | 'amp', 'configured' | 'not_configured'> = {
		anthropic: normalizeCredential(activeConfig.credentials?.anthropic)
			? 'configured'
			: 'not_configured',
		openai: normalizeCredential(activeConfig.credentials?.openai)
			? 'configured'
			: 'not_configured',
		amp: normalizeCredential(activeConfig.credentials?.amp) ? 'configured' : 'not_configured'
	};

	return {
		providerCredentials: statusByProvider,
		legacy: legacyStatus,
		flyToken: normalizeCredential(activeConfig.flyToken) ? 'configured' : 'not_configured',
		flyAppName: normalizeCredential(activeConfig.flyAppName) ? 'configured' : 'not_configured'
	};
};

export const listTasks = (status?: TaskStatus): Task[] => {
	if (!status) {
		return tasks;
	}
	return tasks.filter((task) => task.status === status);
};

type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'logs'> & { logs?: TaskLog[] };

export const createTask = (input: CreateTaskInput): Task => {
	const task: Task = {
		...input,
		id: randomUUID(),
		createdAt: new Date().toISOString(),
		logs: input.logs ?? []
	};
	tasks = [task, ...tasks];
	return task;
};

export const updateTaskStatus = (id: string, status: TaskStatus, errorMessage?: string): Task | null => {
	let updated: Task | null = null;
	tasks = tasks.map((task) => {
		if (task.id !== id) {
			return task;
		}
		updated = {
			...task,
			status,
			errorMessage,
			completedAt: status === 'success' || status === 'failed' ? new Date().toISOString() : task.completedAt
		};
		return updated;
	});
	return updated;
};

export const appendTaskLog = (id: string, log: TaskLog): Task | null => {
	let updated: Task | null = null;
	tasks = tasks.map((task) => {
		if (task.id !== id) {
			return task;
		}
		updated = {
			...task,
			logs: [...task.logs, log]
		};
		return updated;
	});
	return updated;
};

const buildAgentConfig = (entry: (typeof AGENT_REGISTRY)[number], activeConfig: PorterConfig) => {
	const configEntry = activeConfig.agents?.[entry.id] ?? { enabled: false, priority: 'normal' };
	const enabled = Boolean(configEntry.enabled);
	const credentials = activeConfig.credentials ?? {};
	const hasCredentials = entry.requiredKeys.every((key) =>
		Boolean(credentials?.[key as keyof NonNullable<PorterConfig['credentials']>])
	);
	const ready = enabled && hasCredentials;
	let status: AgentConfig['status'] = 'disabled';
	if (!enabled) status = 'disabled';
	if (enabled && !hasCredentials) status = 'error';
	if (ready) status = 'idle';

	return {
		name: entry.id,
		displayName: entry.displayName,
		provider: entry.provider,
		requiredKeys: entry.requiredKeys,
		description: entry.description,
		docsUrl: entry.docsUrl,
		enabled,
		priority: configEntry.priority ?? 'normal',
		customPrompt: configEntry.customPrompt,
		status,
		installed: ready,
		readyState: !enabled ? 'disabled' : hasCredentials ? 'ready' : 'missing_credentials',
		domain: entry.docsUrl
			? new URL(entry.docsUrl).hostname.replace('www.', '')
			: undefined,
		version: undefined,
		lastUsed: undefined,
		taskCount: undefined,
		successRate: undefined
	} satisfies AgentConfig;
};

export const listAgents = async (token: string): Promise<AgentConfig[]> => {
	const activeConfig = await getConfig(token);
	return AGENT_REGISTRY.map((entry) => buildAgentConfig(entry, activeConfig));
};

export const scanAgentsNow = async (token: string): Promise<AgentConfig[]> => listAgents(token);

export const getAgentStatus = async (token: string, name: string): Promise<AgentConfig | null> => {
	const agents = await listAgents(token);
	return agents.find((agent) => agent.name === name) ?? null;
};

export const getConfig = async (token: string): Promise<PorterConfig> => {
	if (!configLoaded.has(token)) {
		let loadedConfig: Partial<PorterConfig> = {};
		let hasLegacyModal = false;
		const d1Config = await loadConfigFromD1(token);
		if (d1Config) {
			loadedConfig = d1Config;
		} else {
			const gistConfig = (await loadConfigFromGist(token, baseConfig)) ?? {};
			hasLegacyModal = Object.prototype.hasOwnProperty.call(
				gistConfig as Record<string, unknown>,
				'modal'
			);
			loadedConfig = gistConfig as PorterConfig;
			const mergedForMigration = {
				...baseConfig,
				...(gistConfig as PorterConfig),
				agents: normalizeAgentConfig((gistConfig as PorterConfig).agents ?? baseConfig.agents),
				providerCredentials: normalizeProviderCredentials(
					Object.keys((gistConfig as PorterConfig).providerCredentials ?? {}).length
						? (gistConfig as PorterConfig).providerCredentials
						: mapLegacyCredentialsToProviders((gistConfig as PorterConfig).credentials)
				),
				flyToken: normalizeFlyToken((gistConfig as PorterConfig).flyToken),
				flyAppName: normalizeFlyAppName((gistConfig as PorterConfig).flyAppName)
			};
			mergedForMigration.credentials = mapProvidersToLegacyCredentials(
				mergedForMigration.providerCredentials,
				(gistConfig as PorterConfig).credentials
			);
			try {
				await saveConfigToD1(token, mergedForMigration);
			} catch {
				setConfigWarning(token, 'D1 migration write failed.');
			}
		}

		const merged = {
			...baseConfig,
			...(loadedConfig as PorterConfig),
			agents: normalizeAgentConfig((loadedConfig as PorterConfig).agents ?? baseConfig.agents),
			providerCredentials: normalizeProviderCredentials(
				Object.keys((loadedConfig as PorterConfig).providerCredentials ?? {}).length
					? (loadedConfig as PorterConfig).providerCredentials
					: mapLegacyCredentialsToProviders((loadedConfig as PorterConfig).credentials)
			),
			flyToken: normalizeFlyToken((loadedConfig as PorterConfig).flyToken),
			flyAppName: normalizeFlyAppName((loadedConfig as PorterConfig).flyAppName)
		};
		merged.credentials = mapProvidersToLegacyCredentials(
			merged.providerCredentials,
			(loadedConfig as PorterConfig).credentials
		);
		configCache.set(token, merged);
		configLoaded.add(token);
		if (hasLegacyModal) {
			try {
				await saveConfigToGist(token, merged);
			} catch {
				setConfigWarning(token, 'Gist mirror update failed after legacy config migration.');
			}
		}
	}
	return configCache.get(token) ?? baseConfig;
};

export const updateConfig = async (token: string, next: PorterConfig): Promise<PorterConfig> => {
	setConfigWarning(token);
	const normalized = {
		...next,
		agents: normalizeAgentConfig(next.agents ?? {}),
		providerCredentials: normalizeProviderCredentials(next.providerCredentials),
		flyToken: normalizeFlyToken(next.flyToken),
		flyAppName: normalizeFlyAppName(next.flyAppName)
	};
	normalized.credentials = mapProvidersToLegacyCredentials(
		normalized.providerCredentials,
		next.credentials
	);
	const d1Persisted = await saveConfigToD1(token, normalized);
	if (!d1Persisted) {
		throw new Error('Failed to persist config to Cloudflare D1. Ensure DB binding is configured.');
	}

	try {
		const gistPersisted = await saveConfigToGist(token, normalized);
		if (!gistPersisted) {
			setConfigWarning(token, 'Optional gist mirror is unavailable. D1 save succeeded.');
		}
	} catch {
		setConfigWarning(token, 'Optional gist mirror failed. D1 save succeeded.');
	}

	configCache.set(token, normalized);
	configLoaded.add(token);
	return normalized;
};

export const updateAgentSettings = async (token: string, agents: AgentConfig[]): Promise<AgentConfig[]> => {
	const activeConfig = await getConfig(token);
	const nextAgents = { ...activeConfig.agents };
	for (const agent of agents) {
		nextAgents[agent.name] = {
			enabled: agent.enabled,
			priority: agent.priority,
			customPrompt: agent.customPrompt
		};
	}
	await updateConfig(token, {
		...activeConfig,
		agents: nextAgents
	});
	return listAgents(token);
};

export const updateCredentials = async (token: string, credentials: PorterConfig['credentials']) => {
	const activeConfig = await getConfig(token);
	const nextCredentials = { ...activeConfig.credentials, ...credentials };
	const nextProviderCredentials = {
		...activeConfig.providerCredentials,
		...mapLegacyCredentialsToProviders(nextCredentials)
	};
	await updateConfig(token, {
		...activeConfig,
		credentials: nextCredentials,
		providerCredentials: nextProviderCredentials
	});
	return getConfig(token);
};

export const updateProviderCredentials = async (
	token: string,
	providerCredentials: PorterConfig['providerCredentials']
) => {
	const activeConfig = await getConfig(token);
	const merged: PorterConfig['providerCredentials'] = {
		...(activeConfig.providerCredentials ?? {})
	};
	for (const [providerId, values] of Object.entries(providerCredentials ?? {})) {
		const nextValues: Record<string, string> = {
			...(merged[providerId] ?? {})
		};
		for (const [envKey, rawValue] of Object.entries(values ?? {})) {
			const value = normalizeCredential(rawValue);
			if (value) nextValues[envKey] = value;
			else delete nextValues[envKey];
		}
		if (Object.keys(nextValues).length > 0) merged[providerId] = nextValues;
		else delete merged[providerId];
	}
	await updateConfig(token, {
		...activeConfig,
		providerCredentials: merged
	});
	return getConfig(token);
};

export const updateFlyConfig = async (
	token: string,
	input: { flyToken?: string; flyAppName?: string }
): Promise<PorterConfig> => {
	const activeConfig = await getConfig(token);
	const nextToken = normalizeFlyToken(input.flyToken);
	const nextApp = normalizeFlyAppName(input.flyAppName);
	await updateConfig(token, {
		...activeConfig,
		flyToken: nextToken,
		flyAppName: nextApp
	});
	return getConfig(token);
};
