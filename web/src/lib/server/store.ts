import { randomUUID } from 'crypto';

import { loadConfigFromGist, saveConfigToGist } from './gist';
import type { AgentStatus, PorterConfig, Task, TaskLog, TaskStatus } from './types';

let tasks: Task[] = [
	{
		id: 'task-42',
		status: 'running',
		repoOwner: 'jackgolding',
		repoName: 'porter',
		issueNumber: 42,
		issueTitle: 'Add user auth system',
		issueBody: 'Add auth endpoints, UI, and guards.',
		agent: 'opencode',
		priority: 3,
		progress: 65,
		createdAt: new Date().toISOString(),
		startedAt: new Date().toISOString(),
		createdBy: 'jackgolding',
		logs: [
			{ time: '14:32:01', level: 'info', message: 'Starting task execution' },
			{ time: '14:32:03', level: 'info', message: 'Analyzing codebase structure' },
			{ time: '14:32:08', level: 'info', message: 'Found 23 relevant files' }
		]
	},
	{
		id: 'task-128',
		status: 'queued',
		repoOwner: 'jackgolding',
		repoName: 'churn',
		issueNumber: 128,
		issueTitle: 'Fix memory leak',
		issueBody: 'Investigate worker pool growth.',
		agent: 'opencode',
		priority: 2,
		progress: 0,
		createdAt: new Date().toISOString(),
		createdBy: 'jackgolding',
		logs: []
	}
];

let config: PorterConfig = {
	version: '1.0.0',
	executionMode: 'local',
	agents: {
		opencode: {
			enabled: true,
			path: '~/.local/bin/opencode'
		}
	},
	settings: {
		maxRetries: 3,
		taskTimeout: 90,
		pollInterval: 10
	}
};

let configLoaded = false;

const agentStatus: AgentStatus[] = [
	{
		name: 'opencode',
		enabled: true,
		path: '~/.local/bin/opencode',
		status: 'idle'
	}
];

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

export const listAgents = (): AgentStatus[] => agentStatus;

export const getAgentStatus = (name: string): AgentStatus | null =>
	agentStatus.find((agent) => agent.name === name) ?? null;

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
