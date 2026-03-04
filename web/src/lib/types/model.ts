export type RecentCommand = {
	id: string;
	model: string;
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
	model: string;
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
