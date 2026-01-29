const GITHUB_API = 'https://api.github.com';

export class GitHubRequestError extends Error {
	status: number;
	body?: string;

	constructor(status: number, message: string, body?: string) {
		super(message);
		this.name = 'GitHubRequestError';
		this.status = status;
		this.body = body;
	}
}

export const isGitHubAuthError = (error: unknown) =>
	error instanceof GitHubRequestError && error.status === 401;

export type PorterTaskStatus = 'queued' | 'running' | 'success' | 'failed';

export type PorterTaskMetadata = {
	taskId: string;
	agent: string;
	priority: 'low' | 'normal' | 'high';
	status: PorterTaskStatus;
	progress: number;
	createdAt: string;
	updatedAt?: string;
	summary?: string;
	prUrl?: string;
	prNumber?: number;
};

const PORTER_LABEL = 'porter:task';
const PORTER_STATUS_LABELS: Record<PorterTaskStatus, string> = {
	queued: 'porter:queued',
	running: 'porter:running',
	success: 'porter:success',
	failed: 'porter:failed'
};

const porterMetadataRegex = /<!--\s*porter:(.*?)\s*-->/s;

export const fetchGitHub = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
	const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`;
	const response = await fetch(url, {
		...init,
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${token}`,
			...(init?.headers ?? {})
		}
	});
	if (!response.ok) {
		const body = await response.text();
		throw new GitHubRequestError(response.status, `GitHub request failed: ${response.status}`, body);
	}
	return (await response.json()) as T;
};

type GitHubRepo = {
	id: number;
	full_name: string;
	name: string;
	owner: { login: string };
	private: boolean;
	description: string | null;
};

export const listInstallationRepos = async (token: string) => {
	const installations = await fetchGitHub<{ total_count: number; installations: { id: number }[] }>(
		'/user/installations',
		token
	);

	if (!installations.total_count) {
		return { repositories: [], installations };
	}

	const repoMap = new Map<number, GitHubRepo>();
	for (const installation of installations.installations) {
		const result = await fetchGitHub<{ repositories: GitHubRepo[] }>(
			`/user/installations/${installation.id}/repositories?per_page=100`,
			token
		);
		for (const repo of result.repositories) {
			repoMap.set(repo.id, repo);
		}
	}

	const repositories = Array.from(repoMap.values()).map((repo) => ({
		id: repo.id,
		fullName: repo.full_name,
		name: repo.name,
		owner: repo.owner.login,
		private: repo.private,
		description: repo.description
	}));

	return { repositories, installations };
};

export const deriveIssueTitle = (prompt: string) => {
	const cleaned = prompt.trim().replace(/\s+/g, ' ');
	if (!cleaned) return 'Porter task';
	const sentence = cleaned.split(/[.!?]/)[0] ?? cleaned;
	const title = sentence.trim().slice(0, 80);
	return title || cleaned.slice(0, 80);
};

export const buildPorterComment = (summary: string, metadata: PorterTaskMetadata) => {
	const payload = JSON.stringify(metadata);
	return `${summary}\n\n<!-- porter:${payload} -->`;
};

export const parsePorterMetadata = (body?: string | null): PorterTaskMetadata | null => {
	if (!body) return null;
	const match = body.match(porterMetadataRegex);
	if (!match?.[1]) return null;
	try {
		return JSON.parse(match[1]) as PorterTaskMetadata;
	} catch {
		return null;
	}
};

type GitHubLabel = { name: string };
type GitHubIssue = {
	id: number;
	number: number;
	title: string;
	body: string | null;
	state: 'open' | 'closed';
	labels: GitHubLabel[];
	created_at: string;
	updated_at: string;
	closed_at: string | null;
	user: { login: string };
	html_url: string;
	pull_request?: { url?: string };
};

type GitHubComment = {
	id: number;
	body: string | null;
	created_at: string;
	updated_at: string;
	user?: { login?: string };
};

const getLabelNames = (labels: GitHubLabel[]) => labels.map((label) => label.name.toLowerCase());

export const getPorterStatus = (labels: GitHubLabel[], state: GitHubIssue['state']): PorterTaskStatus => {
	const names = getLabelNames(labels);
	const statusEntry = Object.entries(PORTER_STATUS_LABELS).find(([, label]) => names.includes(label));
	if (statusEntry) return statusEntry[0] as PorterTaskStatus;
	return state === 'closed' ? 'success' : 'queued';
};

export const getPorterAgent = (labels: GitHubLabel[]) => {
	const agentLabel = labels.find((label) => label.name.toLowerCase().startsWith('porter:agent:'));
	return agentLabel?.name.split(':').slice(2).join(':') ?? 'opencode';
};

export const getPorterPriority = (labels: GitHubLabel[]) => {
	const priorityLabel = labels.find((label) => label.name.toLowerCase().startsWith('porter:priority:'));
	const value = priorityLabel?.name.split(':').slice(2).join(':') ?? 'normal';
	if (value === 'low' || value === 'high' || value === 'normal') return value;
	return 'normal';
};

export const buildPorterLabels = (status: PorterTaskStatus, agent: string, priority: string) => [
	PORTER_LABEL,
	PORTER_STATUS_LABELS[status],
	`porter:agent:${agent}`,
	`porter:priority:${priority}`
];

export const fetchIssue = (token: string, owner: string, repo: string, number: number) =>
	fetchGitHub<GitHubIssue>(`/repos/${owner}/${repo}/issues/${number}`, token);

export const createIssue = (token: string, owner: string, repo: string, title: string, body: string) =>
	fetchGitHub<GitHubIssue>(`/repos/${owner}/${repo}/issues`, token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title, body })
	});

export const updateIssueLabels = (token: string, owner: string, repo: string, number: number, labels: string[]) =>
	fetchGitHub<{ labels: GitHubLabel[] }>(`/repos/${owner}/${repo}/issues/${number}/labels`, token, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ labels })
	});

export const addIssueComment = (token: string, owner: string, repo: string, number: number, body: string) =>
	fetchGitHub<GitHubComment>(`/repos/${owner}/${repo}/issues/${number}/comments`, token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ body })
	});

export const listIssueComments = (token: string, owner: string, repo: string, number: number) =>
	fetchGitHub<GitHubComment[]>(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`, token);

export const listIssuesWithLabel = async (
	token: string,
	owner: string,
	repo: string,
	state: 'open' | 'closed'
) => {
	const issues = await fetchGitHub<GitHubIssue[]>(
		`/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(PORTER_LABEL)}&state=${state}&per_page=100`,
		token
	);
	return issues.filter((issue) => !issue.pull_request);
};

export const getLatestPorterMetadata = (comments: GitHubComment[]) => {
	const sorted = [...comments].sort(
		(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);
	for (const comment of sorted) {
		const metadata = parsePorterMetadata(comment.body);
		if (metadata) return metadata;
	}
	return null;
};

export const buildTaskLog = (metadata: PorterTaskMetadata | null, status: PorterTaskStatus) => {
	const level = status === 'success' ? 'success' : status === 'failed' ? 'error' : 'info';
	const message = metadata?.summary ?? `Task ${status}`;
	return metadata?.updatedAt
		? [{ time: metadata.updatedAt, level, message }]
		: [{ time: new Date().toISOString(), level, message }];
};

export const buildTaskFromIssue = (
	issue: GitHubIssue,
	owner: string,
	repo: string,
	metadata: PorterTaskMetadata | null
) => {
	const status = metadata?.status ?? getPorterStatus(issue.labels, issue.state);
	const agent = metadata?.agent ?? getPorterAgent(issue.labels);
	const priority = metadata?.priority ?? getPorterPriority(issue.labels);
	const progress = metadata?.progress ?? (status === 'success' ? 100 : 0);
	return {
		id: metadata?.taskId ?? `${owner}/${repo}#${issue.number}`,
		status,
		repoOwner: owner,
		repoName: repo,
		issueNumber: issue.number,
		issueTitle: issue.title,
		issueBody: issue.body ?? '',
		agent,
		priority: priority === 'low' ? 1 : priority === 'high' ? 3 : 2,
		progress,
		createdAt: issue.created_at,
		startedAt: metadata?.createdAt,
		completedAt: issue.closed_at ?? undefined,
		createdBy: issue.user.login,
		issueUrl: issue.html_url,
		prNumber: metadata?.prNumber,
		prUrl: metadata?.prUrl,
		summary: metadata?.summary,
		logs: buildTaskLog(metadata, status),
		errorMessage: status === 'failed' ? metadata?.summary : undefined
	};
};
