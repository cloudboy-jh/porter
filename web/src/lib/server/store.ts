import { randomUUID } from 'crypto';

import { loadConfigFromGist, saveConfigToGist } from './gist';
import type { PorterConfig, Task, TaskLog, TaskStatus } from './types';
import type { AgentConfig } from '$lib/types/agent';

// Helper to create timestamps relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

let tasks: Task[] = [
	// Running/Queued Tasks
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
		createdAt: hoursAgo(2),
		startedAt: hoursAgo(1.5),
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
		agent: 'cursor',
		priority: 2,
		progress: 0,
		createdAt: minutesAgo(15),
		createdBy: 'jackgolding',
		logs: []
	},
	
	// Completed Tasks (Success)
	{
		id: 'task-201',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'porter',
		issueNumber: 201,
		issueTitle: 'Improve queue retry logic',
		issueBody: 'Add exponential backoff and better error handling for task retries.',
	agent: 'claude',
		priority: 3,
		progress: 100,
		createdAt: minutesAgo(45),
		startedAt: minutesAgo(40),
		completedAt: minutesAgo(5),
		createdBy: 'jackgolding',
		prNumber: 512,
		logs: [
			{ time: '10:15:02', level: 'info', message: 'Starting task execution' },
			{ time: '10:15:05', level: 'info', message: 'Analyzing retry logic in queue handler' },
			{ time: '10:18:22', level: 'success', message: 'Updated retry mechanism with exponential backoff' },
			{ time: '10:21:45', level: 'success', message: 'Added comprehensive error handling' },
			{ time: '10:25:10', level: 'success', message: 'All tests passing' },
			{ time: '10:26:33', level: 'success', message: 'Created PR #512' }
		]
	},
	{
		id: 'task-189',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'porter',
		issueNumber: 189,
		issueTitle: 'Add dark mode toggle to settings',
		issueBody: 'Implement theme toggle in user settings with persistence.',
		agent: 'cursor',
		priority: 2,
		progress: 100,
		createdAt: hoursAgo(3),
		startedAt: hoursAgo(2.8),
		completedAt: hoursAgo(2),
		createdBy: 'jackgolding',
		prNumber: 498,
		logs: [
			{ time: '08:12:01', level: 'info', message: 'Starting task execution' },
			{ time: '08:14:22', level: 'info', message: 'Adding theme provider to layout' },
			{ time: '08:22:10', level: 'success', message: 'Theme toggle component created' },
			{ time: '08:28:45', level: 'success', message: 'LocalStorage persistence added' },
			{ time: '08:35:20', level: 'success', message: 'Created PR #498' }
		]
	},
	{
		id: 'task-156',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'analytics',
		issueNumber: 156,
		issueTitle: 'Optimize database queries for dashboard',
		issueBody: 'Dashboard loading slowly due to N+1 queries.',
	agent: 'opencode',
		priority: 3,
		progress: 100,
		createdAt: hoursAgo(6),
		startedAt: hoursAgo(5.5),
		completedAt: hoursAgo(4),
		createdBy: 'jackgolding',
		prNumber: 789,
		logs: [
			{ time: '05:10:12', level: 'info', message: 'Starting task execution' },
			{ time: '05:12:45', level: 'info', message: 'Analyzing slow queries' },
			{ time: '05:22:30', level: 'success', message: 'Added database indexes' },
			{ time: '05:35:15', level: 'success', message: 'Implemented query batching' },
			{ time: '05:48:22', level: 'success', message: 'Dashboard load time reduced by 80%' },
			{ time: '05:52:10', level: 'success', message: 'Created PR #789' }
		]
	},
	{
		id: 'task-144',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'churn',
		issueNumber: 144,
		issueTitle: 'Add email notification for churned users',
		issueBody: 'Send automated emails when users show churn signals.',
		agent: 'windsurf',
		priority: 2,
		progress: 100,
		createdAt: hoursAgo(8),
		startedAt: hoursAgo(7.5),
		completedAt: hoursAgo(6.5),
		createdBy: 'jackgolding',
		prNumber: 223,
		logs: [
			{ time: '03:20:05', level: 'info', message: 'Starting task execution' },
			{ time: '03:25:12', level: 'success', message: 'Email template created' },
			{ time: '03:42:30', level: 'success', message: 'Notification service integrated' },
			{ time: '03:55:45', level: 'success', message: 'Created PR #223' }
		]
	},
	{
		id: 'task-132',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'onboard',
		issueNumber: 132,
		issueTitle: 'Improve onboarding flow UX',
		issueBody: 'Streamline the multi-step onboarding process.',
		agent: 'cursor',
		priority: 3,
		progress: 100,
		createdAt: hoursAgo(12),
		startedAt: hoursAgo(11.5),
		completedAt: hoursAgo(10),
		createdBy: 'jackgolding',
		prNumber: 567,
		logs: [
			{ time: '23:15:20', level: 'info', message: 'Starting task execution' },
			{ time: '23:22:10', level: 'success', message: 'Reduced steps from 7 to 4' },
			{ time: '23:45:35', level: 'success', message: 'Added progress indicator' },
			{ time: '00:12:50', level: 'success', message: 'Created PR #567' }
		]
	},
	{
		id: 'task-98',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'core',
		issueNumber: 98,
		issueTitle: 'Add API rate limiting',
		issueBody: 'Implement rate limiting middleware for API endpoints.',
	agent: 'opencode',
		priority: 3,
		progress: 100,
		createdAt: hoursAgo(24),
		startedAt: hoursAgo(23.5),
		completedAt: hoursAgo(22),
		createdBy: 'jackgolding',
		prNumber: 445,
		logs: [
			{ time: '11:30:12', level: 'info', message: 'Starting task execution' },
			{ time: '11:35:22', level: 'success', message: 'Rate limiter middleware created' },
			{ time: '11:52:40', level: 'success', message: 'Redis caching configured' },
			{ time: '12:15:10', level: 'success', message: 'Created PR #445' }
		]
	},
	
	// Failed Tasks
	{
		id: 'task-177',
		status: 'failed',
		repoOwner: 'jackgolding',
		repoName: 'core',
		issueNumber: 177,
		issueTitle: 'Migrate to microservices architecture',
		issueBody: 'Break monolith into separate services.',
		agent: 'cursor',
		priority: 3,
		progress: 45,
		createdAt: hoursAgo(5),
		startedAt: hoursAgo(4.5),
		completedAt: hoursAgo(3),
		createdBy: 'jackgolding',
		errorMessage: 'Task complexity exceeds agent capabilities. Manual intervention required.',
		logs: [
			{ time: '06:10:05', level: 'info', message: 'Starting task execution' },
			{ time: '06:15:22', level: 'info', message: 'Analyzing service boundaries' },
			{ time: '06:45:10', level: 'warning', message: 'Complex dependencies detected' },
			{ time: '07:20:35', level: 'error', message: 'Unable to safely split authentication service' },
			{ time: '07:22:10', level: 'error', message: 'Task failed: Complexity too high for automated refactoring' }
		]
	},
	{
		id: 'task-163',
		status: 'failed',
		repoOwner: 'jackgolding',
		repoName: 'analytics',
		issueNumber: 163,
		issueTitle: 'Fix broken chart rendering',
		issueBody: 'Charts not displaying correctly after recent update.',
		agent: 'windsurf',
		priority: 2,
		progress: 20,
		createdAt: hoursAgo(10),
		startedAt: hoursAgo(9.5),
		completedAt: hoursAgo(9),
		createdBy: 'jackgolding',
		errorMessage: 'Build failed: Type errors in chart component.',
		logs: [
			{ time: '01:05:12', level: 'info', message: 'Starting task execution' },
			{ time: '01:08:30', level: 'info', message: 'Investigating chart component' },
			{ time: '01:15:45', level: 'error', message: 'Type mismatch in data prop' },
			{ time: '01:18:22', level: 'error', message: 'Build failed with 12 type errors' }
		]
	},
	{
		id: 'task-149',
		status: 'failed',
		repoOwner: 'jackgolding',
		repoName: 'porter',
		issueNumber: 149,
		issueTitle: 'Add real-time collaboration features',
		issueBody: 'Implement WebSocket-based real-time editing.',
	agent: 'claude',
		priority: 3,
		progress: 30,
		createdAt: hoursAgo(18),
		startedAt: hoursAgo(17.5),
		completedAt: hoursAgo(16),
		createdBy: 'jackgolding',
		errorMessage: 'WebSocket server configuration failed.',
		logs: [
			{ time: '17:22:10', level: 'info', message: 'Starting task execution' },
			{ time: '17:28:45', level: 'info', message: 'Setting up WebSocket server' },
			{ time: '17:45:20', level: 'warning', message: 'Port 8080 already in use' },
			{ time: '18:02:15', level: 'error', message: 'Failed to bind WebSocket server' },
			{ time: '18:05:30', level: 'error', message: 'Task failed: Server configuration error' }
		]
	},
	
	// More successful tasks for variety
	{
		id: 'task-210',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'porter',
		issueNumber: 210,
		issueTitle: 'Update dependencies to latest versions',
		issueBody: 'Bump all outdated packages and fix breaking changes.',
		agent: 'cursor',
		priority: 1,
		progress: 100,
		createdAt: hoursAgo(48),
		startedAt: hoursAgo(47.5),
		completedAt: hoursAgo(46),
		createdBy: 'jackgolding',
		prNumber: 532,
		logs: [
			{ time: '11:10:05', level: 'info', message: 'Starting task execution' },
			{ time: '11:15:30', level: 'info', message: 'Updating 24 dependencies' },
			{ time: '11:42:15', level: 'success', message: 'All tests passing after updates' },
			{ time: '11:48:20', level: 'success', message: 'Created PR #532' }
		]
	},
	{
		id: 'task-195',
		status: 'success',
		repoOwner: 'jackgolding',
		repoName: 'churn',
		issueNumber: 195,
		issueTitle: 'Add customer segmentation analytics',
		issueBody: 'Implement cohort analysis and segmentation.',
		agent: 'aider',
		priority: 2,
		progress: 100,
		createdAt: hoursAgo(72),
		startedAt: hoursAgo(71),
		completedAt: hoursAgo(68),
		createdBy: 'jackgolding',
		prNumber: 267,
		logs: [
			{ time: '09:05:12', level: 'info', message: 'Starting task execution' },
			{ time: '09:25:40', level: 'success', message: 'Cohort analysis implemented' },
			{ time: '10:15:20', level: 'success', message: 'Segmentation dashboard created' },
			{ time: '11:02:55', level: 'success', message: 'Created PR #267' }
		]
	}
];

let config: PorterConfig = {
	version: '1.0.0',
	executionMode: 'local',
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

const agentStatus: AgentConfig[] = [
	{
		name: 'opencode',
		enabled: true,
		path: '~/.local/bin/opencode',
		status: 'idle',
		domain: agentDomains.opencode,
		version: '0.4.2',
		lastUsed: '12m ago',
		taskCount: 32,
		successRate: 91
	},
	{
		name: 'claude',
		enabled: true,
		path: '~/.claude/claude',
		status: 'idle',
		domain: agentDomains.claude,
		version: '1.1.0',
		lastUsed: '2h ago',
		taskCount: 18,
		successRate: 89
	},
	{
		name: 'cursor',
		enabled: true,
		path: '/Applications/Cursor.app',
		status: 'idle',
		domain: agentDomains.cursor,
		version: '0.32.1',
		lastUsed: '5h ago',
		taskCount: 12,
		successRate: 92
	},
	{
		name: 'windsurf',
		enabled: false,
		path: '',
		status: 'disabled',
		domain: agentDomains.windsurf,
		version: undefined,
		lastUsed: undefined,
		taskCount: 0,
		successRate: 0
	},
	{
		name: 'cline',
		enabled: false,
		path: '',
		status: 'disabled',
		domain: agentDomains.cline,
		version: undefined,
		lastUsed: undefined,
		taskCount: 0,
		successRate: 0
	},
	{
		name: 'aider',
		enabled: false,
		path: '/usr/local/bin/aider',
		status: 'disabled',
		domain: agentDomains.aider,
		version: '0.35.0',
		lastUsed: '2d ago',
		taskCount: 3,
		successRate: 72
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

export const listAgents = (): AgentConfig[] => agentStatus;

export const getAgentStatus = (name: string): AgentConfig | null =>
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
