import { randomUUID } from 'crypto';
import { randomUUID } from 'crypto';
import { loadConfigFromGist, saveConfigToGist } from './gist';
import type { PorterConfig, Task, TaskLog, TaskStatus } from './types';
import type { AgentConfig } from '$lib/types/agent';
import { AGENT_REGISTRY } from '$lib/constants/agent-registry';

let tasks: Task[] = [];

let config: PorterConfig = {
	version: '1.0.0',
	executionMode: 'cloud',
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

let configLoaded = false;

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

export const listAgents = async (): Promise<AgentConfig[]> => {
	const activeConfig = await getConfig();
	return AGENT_REGISTRY.map((entry) => buildAgentConfig(entry, activeConfig));
};

export const scanAgentsNow = async (): Promise<AgentConfig[]> => listAgents();

export const getAgentStatus = async (name: string): Promise<AgentConfig | null> => {
	const agents = await listAgents();
	return agents.find((agent) => agent.name === name) ?? null;
};

export const getConfig = async (): Promise<PorterConfig> => {
	if (!configLoaded) {
		const gistConfig = await loadConfigFromGist();
		if (gistConfig) {
			config = {
				...config,
				...gistConfig,
				agents: normalizeAgentConfig(gistConfig.agents ?? config.agents),
				credentials: normalizeCredentials(gistConfig.credentials)
			};
		}
		config = {
			...config,
			agents: normalizeAgentConfig(config.agents ?? {}),
			credentials: normalizeCredentials(config.credentials)
		};
		configLoaded = true;
	}
	return config;
};

export const updateConfig = async (next: PorterConfig): Promise<PorterConfig> => {
	const normalized = {
		...next,
		agents: normalizeAgentConfig(next.agents ?? {}),
		credentials: normalizeCredentials(next.credentials)
	};
	config = normalized;
	await saveConfigToGist(normalized);
	return config;
};

export const updateAgentSettings = async (agents: AgentConfig[]): Promise<AgentConfig[]> => {
	const activeConfig = await getConfig();
	const nextAgents = { ...activeConfig.agents };
	for (const agent of agents) {
		nextAgents[agent.name] = {
			enabled: agent.enabled,
			priority: agent.priority,
			customPrompt: agent.customPrompt
		};
	}
	await updateConfig({
		...activeConfig,
		agents: nextAgents
	});
	return listAgents();
};

export const updateCredentials = async (credentials: PorterConfig['credentials']) => {
	const activeConfig = await getConfig();
	const nextCredentials = { ...activeConfig.credentials, ...credentials };
	await updateConfig({
		...activeConfig,
		credentials: nextCredentials
	});
	return getConfig();
};
