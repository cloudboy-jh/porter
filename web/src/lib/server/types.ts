export type TaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'timed_out';

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
	issueUrl?: string;
	prNumber?: number;
	prUrl?: string;
	branch?: string;
	callbackAttempts?: number;
	callbackMaxAttempts?: number;
	callbackLastHttpCode?: number;
	summary?: string;
	errorMessage?: string;
	logs: TaskLog[];
}

export interface PorterConfig {
	version: string;
	executionMode: 'cloud' | 'priority';
	selectedModel?: string;
	credentials?: {
		anthropic?: string;
		openai?: string;
		amp?: string;
	};
	providerCredentials?: Record<string, Record<string, string>>;
	modelCredentials?: Record<string, string>;
	settings: {
		maxRetries: number;
		taskTimeout: number;
		pollInterval: number;
	};
		onboarding?: {
		completed: boolean;
		selectedRepos: Array<{
			id: number;
			fullName: string;
			owner: string;
			name: string;
			private: boolean;
		}>;
	};
}
