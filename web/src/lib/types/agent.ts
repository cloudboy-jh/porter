export type AgentStatus = 'idle' | 'active' | 'error' | 'disabled';

export type AgentConfig = {
	name: string;
	enabled: boolean;
	path: string;
	status: AgentStatus;
	icon?: string;
	domain?: string;
	version?: string;
	lastUsed?: string;
	taskCount?: number;
	successRate?: number;
};

export type RecentCommand = {
	id: string;
	agent: string;
	repository: string;
	issue: number;
	issueTitle?: string;
	timestamp: number;
	priority: string;
};

export type CommandTemplate = {
	id: string;
	name: string;
	description: string;
	priority: 'low' | 'normal' | 'high';
	promptTemplate: string;
};

export type ParsedCommand = {
	agent: string;
	repoOwner: string;
	repoName: string;
	issueNumber: number;
	priority: string;
	prompt: string;
};

export type GitHubIssue = {
	number: number;
	title: string;
	body: string;
	state: 'open' | 'closed';
	labels: Array<{ name: string; color: string }>;
	html_url: string;
};
