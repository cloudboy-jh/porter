import { randomUUID } from 'crypto';
import { loadConfigFromGist, saveConfigToGist } from './gist';
import type { PorterConfig, Task, TaskLog, TaskStatus } from './types';
import type { AgentConfig } from '$lib/types/agent';
import { AGENT_REGISTRY } from '$lib/constants/agent-registry';

let tasks: Task[] = [];

const baseConfig: PorterConfig = {
	version: '1.0.0',
	executionMode: 'cloud',
	modal: {
		tokenId: '',
		tokenSecret: ''
	},
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

const normalizeModal = (modal?: PorterConfig['modal']) => {
	if (!modal) return { tokenId: '', tokenSecret: '' };
	return {
		tokenId: normalizeCredential(modal.tokenId) ?? '',
		tokenSecret: normalizeCredential(modal.tokenSecret) ?? ''
	};
};

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
	const hasCredentials = entry.requiredKeys.every((key) => Boolean(credentials?.[key]));
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
		const gistConfig = await loadConfigFromGist(token, baseConfig);
		const merged = {
			...baseConfig,
			...(gistConfig ?? {}),
			agents: normalizeAgentConfig(gistConfig?.agents ?? baseConfig.agents),
			credentials: normalizeCredentials(gistConfig?.credentials),
			modal: normalizeModal(gistConfig?.modal)
		};
		configCache.set(token, merged);
		configLoaded.add(token);
	}
	return configCache.get(token) ?? baseConfig;
};

export const updateConfig = async (token: string, next: PorterConfig): Promise<PorterConfig> => {
	const normalized = {
		...next,
		agents: normalizeAgentConfig(next.agents ?? {}),
		credentials: normalizeCredentials(next.credentials),
		modal: normalizeModal(next.modal)
	};
	configCache.set(token, normalized);
	configLoaded.add(token);
	await saveConfigToGist(token, normalized);
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
	await updateConfig(token, {
		...activeConfig,
		credentials: nextCredentials
	});
	return getConfig(token);
};

export const updateModalCredentials = async (
	token: string,
	modal: PorterConfig['modal']
): Promise<PorterConfig> => {
	const activeConfig = await getConfig(token);
	const nextModal = { ...activeConfig.modal, ...modal };
	await updateConfig(token, {
		...activeConfig,
		modal: nextModal
	});
	return getConfig(token);
};
