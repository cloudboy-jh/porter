import { randomUUID } from 'crypto';
import { randomUUID } from 'crypto';
import { access } from 'fs/promises';
import { homedir } from 'os';
import { resolve } from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { loadConfigFromGist, saveConfigToGist } from './gist';
import type { PorterConfig, Task, TaskLog, TaskStatus } from './types';
import type { AgentConfig } from '$lib/types/agent';

const execFileAsync = promisify(execFile);

let tasks: Task[] = [];

let config: PorterConfig = {
	version: '1.0.0',
	executionMode: 'cloud',
	agents: {
		opencode: {
			enabled: true,
			path: '~/.local/bin/opencode'
		},
		claude: {
			enabled: true,
			path: '~/.claude/claude'
		}
	},
	settings: {
		maxRetries: 3,
		taskTimeout: 90,
		pollInterval: 10
	},
	onboarding: {
		completed: false,
		selectedRepos: [],
		enabledAgents: ['opencode', 'claude']
	}
};

let configLoaded = false;

const agentDomains: Record<string, string> = {
	opencode: 'opencode.ai',
	claude: 'claude.ai',
	cursor: 'cursor.com',
	windsurf: 'windsurf.com',
	cline: 'github.com/cline',
	aider: 'aider.chat'
};

let agentCache: AgentConfig[] = [];
let lastAgentScan = 0;
const AGENT_SCAN_TTL = 30_000;

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

const expandPath = (value?: string) => {
	if (!value) return '';
	if (value.startsWith('~/')) {
		return resolve(homedir(), value.slice(2));
	}
	return value.startsWith('/') ? value : resolve(value);
};

const runVersionCommand = async (binaryPath: string) => {
	const candidates = [['--version'], ['-v'], ['version']];
	for (const args of candidates) {
		try {
			const { stdout, stderr } = await execFileAsync(binaryPath, args, { timeout: 5000 });
			const output = `${stdout ?? ''}${stderr ?? ''}`.trim();
			if (output) {
				return output.split('\n')[0].trim();
			}
		} catch {
			// try next
		}
	}
	return undefined;
};

const scanAgents = async (force = false): Promise<AgentConfig[]> => {
	const now = Date.now();
	if (!force && agentCache.length && now - lastAgentScan < AGENT_SCAN_TTL) {
		return agentCache;
	}

	const activeConfig = await getConfig();
	const entries = Object.entries(activeConfig.agents ?? {});
	const results = await Promise.all(
		entries.map(async ([name, configEntry]) => {
			const pathValue = expandPath(configEntry.path);
			let installed = false;
			try {
				if (pathValue) {
					await access(pathValue);
					installed = true;
				}
			} catch {
				installed = false;
			}

			const version = installed ? await runVersionCommand(pathValue) : undefined;
			const enabled = Boolean(configEntry.enabled);
			let status: AgentConfig['status'] = 'disabled';
			if (enabled && installed) status = 'idle';
			if (enabled && !installed) status = 'error';
			if (!enabled) status = 'disabled';

			return {
				name,
				enabled,
				priority: configEntry.enabled ? 'normal' : 'low',
				status,
				installed,
				path: pathValue || undefined,
				domain: agentDomains[name] ?? 'github.com',
				version,
				lastUsed: undefined,
				taskCount: undefined,
				successRate: undefined
			} satisfies AgentConfig;
		})
	);

	agentCache = results;
	lastAgentScan = now;
	return results;
};

export const listAgents = async (): Promise<AgentConfig[]> => scanAgents();

export const scanAgentsNow = async (): Promise<AgentConfig[]> => scanAgents(true);

export const getAgentStatus = async (name: string): Promise<AgentConfig | null> => {
	const agents = await scanAgents();
	return agents.find((agent) => agent.name === name) ?? null;
};

export const getConfig = async (): Promise<PorterConfig> => {
	if (!configLoaded) {
		const gistConfig = await loadConfigFromGist();
		if (gistConfig) {
			config = gistConfig;
		}
		configLoaded = true;
	}
	return config;
};

export const updateConfig = async (next: PorterConfig): Promise<PorterConfig> => {
	config = next;
	await saveConfigToGist(next);
	return config;
};
