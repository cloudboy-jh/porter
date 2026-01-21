export type TaskStatus = 'queued' | 'running' | 'success' | 'failed';

export interface TaskLog {
	time: string;
	level: 'info' | 'success' | 'warning' | 'error';
	message: string;
}

export interface Task {
	id: string;
	status: TaskStatus;
	repoOwner: string;
	repoName: string;
	issueNumber: number;
	issueTitle: string;
	issueBody: string;
	agent: string;
	priority: number;
	progress: number;
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	createdBy: string;
	prNumber?: number;
	errorMessage?: string;
	logs: TaskLog[];
}

export interface AgentStatus {
	name: string;
	enabled: boolean;
	path: string;
	status: 'active' | 'idle' | 'error';
	currentTaskId?: string;
}

export interface PorterConfig {
	version: string;
	executionMode: 'cloud' | 'priority';
	agents: Record<
		string,
		{
			enabled: boolean;
			path?: string;
			args?: string[];
		}
	>;
	settings: {
		maxRetries: number;
		taskTimeout: number;
		pollInterval: number;
	};
}
