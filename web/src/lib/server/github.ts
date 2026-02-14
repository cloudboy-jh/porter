import { createSign } from 'crypto';
import { env } from '$env/dynamic/private';
import { githubCache, CACHE_TTL } from './cache';

const GITHUB_API = 'https://api.github.com';

const toBase64Url = (value: string | Uint8Array) =>
	Buffer.from(typeof value === 'string' ? value : Uint8Array.from(value))
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

const getGitHubAppPrivateKey = () => {
	const raw = env.GITHUB_APP_PRIVATE_KEY?.trim();
	if (!raw) {
		throw new Error('Missing GITHUB_APP_PRIVATE_KEY');
	}
	return raw.replace(/\\n/g, '\n');
};

const getGitHubAppId = () => {
	const appId = env.GITHUB_APP_ID?.trim();
	if (!appId) {
		throw new Error('Missing GITHUB_APP_ID');
	}
	return appId;
};

export const createGitHubAppJwt = () => {
	const now = Math.floor(Date.now() / 1000);
	const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
	const payload = toBase64Url(
		JSON.stringify({
			iat: now - 60,
			exp: now + 9 * 60,
			iss: getGitHubAppId()
		})
	);
	const unsigned = `${header}.${payload}`;
	const signer = createSign('RSA-SHA256');
	signer.update(unsigned);
	signer.end();
	const signature = signer.sign(getGitHubAppPrivateKey());
	return `${unsigned}.${toBase64Url(Uint8Array.from(signature))}`;
};

export const createInstallationAccessToken = async (installationId: number) => {
	const jwt = createGitHubAppJwt();
	const response = await fetch(
		`${GITHUB_API}/app/installations/${installationId}/access_tokens`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${jwt}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({})
		}
	);

	if (!response.ok) {
		const body = await response.text();
		throw new GitHubRequestError(
			response.status,
			`Failed to create installation token: ${response.status}`,
			body
		);
	}

	const payload = (await response.json()) as { token: string; expires_at?: string };
	return {
		token: payload.token,
		expiresAt: payload.expires_at
	};
};

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

const getGitHubErrorPayload = (body?: string): { message?: string } => {
	if (!body) return {};
	try {
		const parsed = JSON.parse(body) as { message?: unknown };
		if (typeof parsed.message === 'string') {
			return { message: parsed.message };
		}
	} catch {
		// ignore invalid JSON error bodies
	}
	return {};
};

const isRateLimitMessage = (message?: string) =>
	Boolean(message && /rate limit|secondary rate limit/i.test(message));

export const getGitHubErrorMessage = (error: unknown, fallback = 'GitHub request failed') => {
	if (!(error instanceof GitHubRequestError)) return fallback;
	const payload = getGitHubErrorPayload(error.body);
	return payload.message ?? fallback;
};

export const isGitHubAuthError = (error: unknown) =>
	error instanceof GitHubRequestError && error.status === 401;

export const isGitHubRateLimitError = (error: unknown) =>
	error instanceof GitHubRequestError &&
	(error.status === 429 ||
		(error.status === 403 &&
			isRateLimitMessage(getGitHubErrorPayload(error.body).message)));

export const isGitHubPermissionError = (error: unknown) =>
	error instanceof GitHubRequestError && error.status === 403 && !isGitHubRateLimitError(error);

export type PorterTaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'timed_out';

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
	branchName?: string;
	commitHash?: string;
	failureStage?: 'dispatch' | 'agent' | 'callback' | 'pr';
	callbackAttempts?: number;
	callbackMaxAttempts?: number;
	callbackLastHttpCode?: number;
};

const PORTER_LABEL = 'porter:task';
const PORTER_STATUS_LABELS: Record<PorterTaskStatus, string> = {
	queued: 'porter:queued',
	running: 'porter:running',
	success: 'porter:success',
	failed: 'porter:failed',
	timed_out: 'porter:timed_out'
};

const porterMetadataRegex = /<!--\s*porter:(.*?)\s*-->/s;

// Track rate limit info
let rateLimitRemaining = 5000;
let rateLimitReset = 0;

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
	
	// Update rate limit tracking
	const remaining = response.headers.get('X-RateLimit-Remaining');
	const reset = response.headers.get('X-RateLimit-Reset');
	if (remaining) rateLimitRemaining = parseInt(remaining, 10);
	if (reset) rateLimitReset = parseInt(reset, 10);
	
	if (!response.ok) {
		const body = await response.text();
		throw new GitHubRequestError(response.status, `GitHub request failed: ${response.status}`, body);
	}
	return (await response.json()) as T;
};

export const getRateLimitStatus = () => ({
	remaining: rateLimitRemaining,
	reset: rateLimitReset,
	isLow: rateLimitRemaining < 100
});

type GitHubRepo = {
	id: number;
	full_name: string;
	name: string;
	owner: { login: string };
	private: boolean;
	description: string | null;
};

type GitHubUserInstallation = {
	id: number;
	app_id?: number;
	app_slug?: string;
	account?: { login?: string; id?: number; avatar_url?: string };
	target_type?: string;
	created_at?: string;
};

type GitHubInstallationsResponse = {
	total_count: number;
	installations: GitHubUserInstallation[];
};

export type PorterInstallationStatus = 'installed' | 'not_installed' | 'indeterminate';

const listUserInstallations = (token: string) =>
	fetchGitHub<GitHubInstallationsResponse>('/user/installations?per_page=100', token);

export const listPorterInstallations = async (token: string) => {
	return listUserInstallations(token);
};

const wait = async (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

export const resolvePorterInstallationStatus = async (
	token: string,
	options?: { attempts?: number; delayMs?: number }
): Promise<{
	status: PorterInstallationStatus;
	installations: GitHubInstallationsResponse;
	reason?: string;
}> => {
	const attempts = Math.max(1, options?.attempts ?? 1);
	const delayMs = Math.max(0, options?.delayMs ?? 0);

	let lastError: unknown = null;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			const installations = await listPorterInstallations(token);
			return {
				status: installations.total_count > 0 ? 'installed' : 'not_installed',
				installations
			};
		} catch (error) {
			if (isGitHubAuthError(error)) {
				throw error;
			}
			lastError = error;
			if (attempt < attempts && delayMs > 0) {
				await wait(delayMs);
			}
		}
	}

	return {
		status: 'indeterminate',
		installations: { total_count: 0, installations: [] },
		reason:
			(lastError instanceof Error && lastError.message) ||
			getGitHubErrorMessage(lastError, 'Unable to verify GitHub app installation.')
	};
};

export const hasPorterInstallation = async (token: string) => {
	const resolution = await resolvePorterInstallationStatus(token);
	return resolution.status === 'installed';
};

export const listInstallationRepos = async (token: string) => {
	const cacheKey = `installations:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log('[Fetching] listInstallationRepos from GitHub');
		const installations = await listPorterInstallations(token);

		if (!installations.total_count) {
			return { repositories: [], installations };
		}

		const repoMap = new Map<number, GitHubRepo>();
		const warnings: Array<{ installationId: number; status?: number; message: string }> = [];
		for (const installation of installations.installations) {
			try {
				const result = await fetchGitHub<{ repositories: GitHubRepo[] }>(
					`/user/installations/${installation.id}/repositories?per_page=100`,
					token
				);
				for (const repo of result.repositories) {
					repoMap.set(repo.id, repo);
				}
			} catch (error) {
				if (error instanceof GitHubRequestError) {
					warnings.push({
						installationId: installation.id,
						status: error.status,
						message: getGitHubErrorMessage(error, 'Failed to load installation repositories')
					});
					if (error.status === 401) {
						throw error;
					}
					continue;
				}
				throw error;
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

		return { repositories, installations, warnings };
	}, CACHE_TTL.REPOS);
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

export const addIssueCommentReaction = (
	token: string,
	owner: string,
	repo: string,
	commentId: number,
	reaction: '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes'
) =>
	fetchGitHub<{ id: number }>(`/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`, token, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/vnd.github+json'
		},
		body: JSON.stringify({ content: reaction })
	});

export const createPullRequest = (
	token: string,
	owner: string,
	repo: string,
	input: { title: string; head: string; base: string; body?: string; draft?: boolean }
) =>
	fetchGitHub<GitHubPull>(`/repos/${owner}/${repo}/pulls`, token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});

export const findOpenPullRequestByHead = async (
	token: string,
	owner: string,
	repo: string,
	head: string
) => {
	const pulls = await fetchGitHub<GitHubPull[]>(
		`/repos/${owner}/${repo}/pulls?state=all&head=${encodeURIComponent(`${owner}:${head}`)}`,
		token
	);
	return pulls[0] ?? null;
};

type GitHubContentFile = {
	type: 'file';
	content?: string;
	encoding?: string;
};

export const fetchRepoFileContent = async (
	token: string,
	owner: string,
	repo: string,
	path: string
) => {
	try {
		const file = await fetchGitHub<GitHubContentFile>(
			`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
			token
		);
		if (file.type !== 'file' || !file.content) return null;
		if (file.encoding !== 'base64') return null;
		const normalized = file.content.replace(/\n/g, '');
		return Buffer.from(normalized, 'base64').toString('utf8');
	} catch (error) {
		if (error instanceof GitHubRequestError && error.status === 404) {
			return null;
		}
		throw error;
	}
};

export const listIssueComments = async (token: string, owner: string, repo: string, number: number) => {
	const cacheKey = `comments:${owner}/${repo}#${number}:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log(`[Fetching] listIssueComments: ${owner}/${repo}#${number}`);
		return fetchGitHub<GitHubComment[]>(
			`/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`,
			token
		);
	}, CACHE_TTL.COMMENTS);
};

export const listIssuesWithLabel = async (
	token: string,
	owner: string,
	repo: string,
	state: 'open' | 'closed'
) => {
	const cacheKey = `issues:${owner}/${repo}:${state}:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log(`[Fetching] listIssuesWithLabel: ${owner}/${repo}:${state}`);
		const issues = await fetchGitHub<GitHubIssue[]>(
			`/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(PORTER_LABEL)}&state=${state}&per_page=100`,
			token
		);
		return issues.filter((issue) => !issue.pull_request);
	}, CACHE_TTL.ISSUES);
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
	const level = status === 'success' ? 'success' : status === 'failed' || status === 'timed_out' ? 'error' : 'info';
	const message = metadata?.summary ?? `Task ${status}`;
	const baseTime = metadata?.updatedAt ?? new Date().toISOString();
	const logs = [{ time: baseTime, level, message }];
	if (metadata?.callbackAttempts && metadata.callbackAttempts > 1) {
		logs.push({
			time: baseTime,
			level: 'warning',
			message: `Callback succeeded after ${metadata.callbackAttempts}/${metadata.callbackMaxAttempts ?? metadata.callbackAttempts} attempts.`
		});
	}
	if (metadata?.callbackLastHttpCode && metadata.callbackLastHttpCode >= 300) {
		logs.push({
			time: baseTime,
			level: 'warning',
			message: `Callback reported non-2xx code before success: HTTP ${metadata.callbackLastHttpCode}.`
		});
	}
	return logs;
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
		branch: metadata?.branchName,
		callbackAttempts: metadata?.callbackAttempts,
		callbackMaxAttempts: metadata?.callbackMaxAttempts,
		callbackLastHttpCode: metadata?.callbackLastHttpCode,
		summary: metadata?.summary,
		logs: buildTaskLog(metadata, status),
		errorMessage: status === 'failed' ? metadata?.summary : undefined
	};
};

// Pull Request types
type GitHubPull = {
	number: number;
	html_url: string;
	base: { sha: string };
	head: { sha: string };
	additions: number;
	deletions: number;
	mergeable: boolean | null;
	mergeable_state?: string;
};

type GitHubPullFile = {
	filename: string;
	status?: 'added' | 'modified' | 'removed' | 'renamed' | string;
	previous_filename?: string;
	additions: number;
	deletions: number;
};

type GitHubRepoWithPermissions = {
	id: number;
	full_name: string;
	name: string;
	owner: { login: string };
	private: boolean;
	description: string | null;
	permissions?: { push?: boolean; admin?: boolean };
};

// Cached PR operations
export const fetchPullRequest = async (
	token: string,
	owner: string,
	repo: string,
	prNumber: number
): Promise<GitHubPull> => {
	const cacheKey = `pr:${owner}/${repo}/${prNumber}:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log(`[Fetching] fetchPullRequest: ${owner}/${repo}/${prNumber}`);
		return fetchGitHub<GitHubPull>(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
	}, CACHE_TTL.ISSUES);
};

export const fetchPullRequestFiles = async (
	token: string,
	owner: string,
	repo: string,
	prNumber: number,
	page: number = 1,
	perPage: number = 5
): Promise<{ files: GitHubPullFile[]; totalPages: number }> => {
	const cacheKey = `pr-files:${owner}/${repo}/${prNumber}:${page}:${perPage}:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log(`[Fetching] fetchPullRequestFiles: ${owner}/${repo}/${prNumber} page ${page}`);
		const response = await fetch(
			`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${perPage}&page=${page}`,
			{
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`
				}
			}
		);
		
		if (!response.ok) {
			throw new GitHubRequestError(response.status, `Failed to fetch PR files: ${response.status}`);
		}
		
		const files = (await response.json()) as GitHubPullFile[];
		const linkHeader = response.headers.get('link');
		const totalPages = parseLastPage(linkHeader);
		
		// Update rate limit tracking
		const remaining = response.headers.get('X-RateLimit-Remaining');
		const reset = response.headers.get('X-RateLimit-Reset');
		if (remaining) rateLimitRemaining = parseInt(remaining, 10);
		if (reset) rateLimitReset = parseInt(reset, 10);
		
		return { files, totalPages };
	}, CACHE_TTL.ISSUES);
};

const parseLastPage = (linkHeader: string | null): number => {
	if (!linkHeader) return 1;
	const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
	if (!match) return 1;
	return Number.parseInt(match[1], 10);
};

export const fetchRepo = async (
	token: string,
	owner: string,
	repo: string
): Promise<GitHubRepoWithPermissions> => {
	const cacheKey = `repo:${owner}/${repo}:${token.slice(-8)}`;
	
	return githubCache.getOrFetch(cacheKey, async () => {
		console.log(`[Fetching] fetchRepo: ${owner}/${repo}`);
		return fetchGitHub<GitHubRepoWithPermissions>(`/repos/${owner}/${repo}`, token);
	}, CACHE_TTL.REPOS);
};

export const mergePullRequest = async (
	token: string,
	owner: string,
	repo: string,
	prNumber: number
): Promise<{ merged: boolean; message?: string; sha?: string }> => {
	// This is a write operation - do not cache
	console.log(`[Fetching] mergePullRequest: ${owner}/${repo}/${prNumber}`);
	
	const response = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
		{
			method: 'PUT',
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({})
		}
	);
	
	// Update rate limit tracking
	const remaining = response.headers.get('X-RateLimit-Remaining');
	const reset = response.headers.get('X-RateLimit-Reset');
	if (remaining) rateLimitRemaining = parseInt(remaining, 10);
	if (reset) rateLimitReset = parseInt(reset, 10);
	
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		return { merged: false, message: body?.message ?? 'Merge failed' };
	}
	
	const result = await response.json() as { sha?: string };
	
	// Clear PR-related caches after successful merge
	githubCache.delete(`pr:${owner}/${repo}/${prNumber}:${token.slice(-8)}`);
	githubCache.clearPattern(`pr-files:${owner}/${repo}/${prNumber}:`);
	
	return { merged: true, sha: result.sha };
};

// Cache clearing utilities for PR operations
export const clearPRCache = (token: string, owner: string, repo: string, prNumber?: number) => {
	if (prNumber) {
		githubCache.delete(`pr:${owner}/${repo}/${prNumber}:${token.slice(-8)}`);
		githubCache.clearPattern(`pr-files:${owner}/${repo}/${prNumber}:`);
	}
};

export const clearRepoCache = (token: string, owner: string, repo: string) => {
	githubCache.delete(`repo:${owner}/${repo}:${token.slice(-8)}`);
};
