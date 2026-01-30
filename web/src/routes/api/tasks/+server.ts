import { json } from '@sveltejs/kit';

import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	buildTaskFromIssue,
	createIssue,
	deriveIssueTitle,
	fetchIssue,
	getLatestPorterMetadata,
	getRateLimitStatus,
	isGitHubAuthError,
	isGitHubRateLimitError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel,
	updateIssueLabels
} from '$lib/server/github';
import type { PorterTaskMetadata } from '$lib/server/github';
import type { TaskStatus } from '$lib/server/types';
import { clearSession } from '$lib/server/auth';
import { githubCache } from '$lib/server/cache';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const status = url.searchParams.get('status') as TaskStatus | null;
		const { repositories } = await listInstallationRepos(session.token);
		
		// Limit to first 20 repos to prevent rate limit issues
		const limitedRepos = repositories.slice(0, 20);
		if (repositories.length > 20) {
			console.warn(`[Rate Limit Protection] Limiting to 20 repos out of ${repositories.length} total`);
		}
		
		// Process repos sequentially to avoid burst
		const allTasks = [];
		for (const repo of limitedRepos) {
			try {
				const issues = await listIssuesWithLabel(session.token, repo.owner, repo.name, 'open');
				// Limit to 10 issues per repo to prevent rate limit issues
				const limitedIssues = issues.slice(0, 10);
				
				// Process issues sequentially to avoid burst
				for (const issue of limitedIssues) {
					try {
						const comments = await listIssueComments(session.token, repo.owner, repo.name, issue.number);
						const metadata = getLatestPorterMetadata(comments);
						const task = buildTaskFromIssue(issue, repo.owner, repo.name, metadata);
						allTasks.push(task);
					} catch (error) {
						console.error(`Failed to load task for issue ${repo.fullName}#${issue.number}:`, error);
					}
				}
			} catch (error) {
				if (isGitHubAuthError(error)) {
					throw error;
				}
				console.error('Failed to load tasks for repo:', repo.fullName, error);
			}
		}

		const filtered = status ? allTasks.filter((task) => task.status === status) : allTasks;
		return json(filtered);
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		if (isGitHubRateLimitError(error)) {
			const status = getRateLimitStatus();
			const resetDate = new Date(status.reset * 1000);
			const minutesUntil = Math.ceil((status.reset * 1000 - Date.now()) / 60000);
			console.error('GitHub rate limit exceeded, resets at:', resetDate.toISOString());
			return json({ 
				error: 'rate_limit', 
				message: `GitHub API rate limit exceeded. Resets in ${minutesUntil} minutes at ${resetDate.toLocaleTimeString()}`,
				resetAt: resetDate.toISOString(),
				minutesUntilReset: minutesUntil 
			}, { status: 429 });
		}
		console.error('Failed to load tasks:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const payload = (await request.json()) as Record<string, unknown>;
	const repoOwner = payload.repoOwner as string | undefined;
	const repoName = payload.repoName as string | undefined;
	const issueNumber = payload.issueNumber ? Number(payload.issueNumber) : null;
	const agent = (payload.agent as string | undefined) ?? 'opencode';
	const priority = (payload.priority as string | number | undefined) ?? 'normal';
	const prompt = (payload.prompt as string | undefined) ?? '';
	const issueBody = (payload.issueBody as string | undefined) ?? prompt;

	try {
		if (!repoOwner || !repoName) {
			return json({ error: 'repoOwner and repoName are required' }, { status: 400 });
		}

		if (!issueNumber && !prompt) {
			return json({ error: 'issueNumber or prompt is required' }, { status: 400 });
		}

		let issue = null;
		if (issueNumber) {
			issue = await fetchIssue(session.token, repoOwner, repoName, issueNumber);
		} else {
			const derivedTitle = deriveIssueTitle(prompt);
			issue = await createIssue(session.token, repoOwner, repoName, derivedTitle, issueBody);
		}

		const normalizedPriority =
			priority === 'low' || priority === 'high' || priority === 'normal'
				? priority
				: priority === 1
					? 'low'
					: priority === 3
						? 'high'
						: 'normal';

		const metadata: PorterTaskMetadata = {
			taskId: `${repoOwner}/${repoName}#${issue.number}`,
			agent,
			priority: normalizedPriority,
			status: 'queued',
			progress: 0,
			createdAt: new Date().toISOString(),
			summary: 'Task queued'
		};

		await updateLabelsAndComment(session.token, repoOwner, repoName, issue.number, metadata);

		// Clear cache for this repo's issues to reflect the new task
		githubCache.clearPattern(`issues:${repoOwner}/${repoName}`);

		const comments = await listIssueComments(session.token, repoOwner, repoName, issue.number);
		const latestMetadata = getLatestPorterMetadata(comments);
		const task = buildTaskFromIssue(issue, repoOwner, repoName, latestMetadata);
		return json(task, { status: 201 });
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to create task:', error);
		return json({ error: 'failed' }, { status: 500 });
	}
};

const updateLabelsAndComment = async (
	token: string,
	owner: string,
	repo: string,
	number: number,
	metadata: PorterTaskMetadata
) => {
	const issue = await fetchIssue(token, owner, repo, number);
	const existingLabels = issue.labels.map((label) => label.name);
	const porterLabels = buildPorterLabels(metadata.status, metadata.agent, metadata.priority);
	const cleanedLabels = existingLabels.filter((label) => {
		const lower = label.toLowerCase();
		if (lower === 'porter:task') return false;
		if (lower.startsWith('porter:agent:')) return false;
		if (lower.startsWith('porter:priority:')) return false;
		if (lower.startsWith('porter:queued')) return false;
		if (lower.startsWith('porter:running')) return false;
		if (lower.startsWith('porter:success')) return false;
		if (lower.startsWith('porter:failed')) return false;
		return true;
	});
	const labels = Array.from(new Set([...cleanedLabels, ...porterLabels]));
	await updateIssueLabels(token, owner, repo, number, labels);
	const comment = buildPorterComment(metadata.summary ?? 'Task update', {
		...metadata,
		updatedAt: new Date().toISOString()
	});
	await addIssueComment(token, owner, repo, number, comment);
};
