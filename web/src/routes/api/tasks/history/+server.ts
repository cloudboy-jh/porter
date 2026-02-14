import { json } from '@sveltejs/kit';

import {
	buildTaskFromIssue,
	getLatestPorterMetadata,
	isGitHubAuthError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel
} from '$lib/server/github';
import { clearSession } from '$lib/server/auth';
import { getConfig } from '$lib/server/store';
import { filterReposBySelection } from '$lib/server/repo-selection';
import type { RequestHandler } from './$types';

// Limits to prevent rate limit exhaustion
const MAX_REPOS_TO_CHECK = 20;
const MAX_ISSUES_PER_REPO = 50;

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const status = url.searchParams.get('status');
	const agent = url.searchParams.get('agent');
	const repo = url.searchParams.get('repo');
	const branch = url.searchParams.get('branch');
	const issueNumber = url.searchParams.get('issueNumber');
	const search = url.searchParams.get('search');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

	let filteredTasks: ReturnType<typeof buildTaskFromIssue>[] = [];
	try {
		const [{ repositories }, config] = await Promise.all([
			listInstallationRepos(session.token),
			getConfig(session.token)
		]);
		const scopedRepos = filterReposBySelection(config, repositories);
		
		// Limit repos to prevent rate limit exhaustion
		const reposToCheck = scopedRepos.slice(0, MAX_REPOS_TO_CHECK);
		if (scopedRepos.length > MAX_REPOS_TO_CHECK) {
			console.warn(`[History] Limiting to ${MAX_REPOS_TO_CHECK} repos out of ${scopedRepos.length} total`);
		}
		
		console.log(`[History] Loading tasks from ${reposToCheck.length} repos`);
		
		// Process repos sequentially to avoid burst
		const allTasks: ReturnType<typeof buildTaskFromIssue>[] = [];
		for (const repo of reposToCheck) {
			try {
				const [openIssues, closedIssues] = await Promise.all([
					listIssuesWithLabel(session.token, repo.owner, repo.name, 'open'),
					listIssuesWithLabel(session.token, repo.owner, repo.name, 'closed')
				]);
				
				// Limit issues per repo
				const issues = [...openIssues, ...closedIssues].slice(0, MAX_ISSUES_PER_REPO);
				
				// Process issues sequentially to avoid burst
				for (const issue of issues) {
					try {
						const comments = await listIssueComments(session.token, repo.owner, repo.name, issue.number);
						const metadata = getLatestPorterMetadata(comments);
						allTasks.push(buildTaskFromIssue(issue, repo.owner, repo.name, metadata));
					} catch (error) {
						console.error(`Failed to process issue ${repo.fullName}#${issue.number}:`, error);
					}
				}
			} catch (error) {
				if (isGitHubAuthError(error)) {
					throw error;
				}
				console.error('Failed to load history for repo:', repo.fullName, error);
			}
		}

		filteredTasks = allTasks;
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to load task history:', error);
		return json({ error: 'failed' }, { status: 500 });
	}

	// Apply filters
	if (status && (status === 'success' || status === 'failed')) {
		filteredTasks = filteredTasks.filter((task) => task.status === status);
	}

	if (agent) {
		filteredTasks = filteredTasks.filter((task) => task.agent === agent);
	}

	if (repo) {
		filteredTasks = filteredTasks.filter(
			(task) => `${task.repoOwner}/${task.repoName}`.toLowerCase().includes(repo.toLowerCase())
		);
	}

	if (branch) {
		filteredTasks = filteredTasks.filter((task) => {
			return task.branch?.toLowerCase() === branch.toLowerCase();
		});
	}

	if (issueNumber) {
		const issueNum = parseInt(issueNumber);
		if (!isNaN(issueNum)) {
			filteredTasks = filteredTasks.filter((task) => task.issueNumber === issueNum);
		}
	}

	if (search) {
		const searchLower = search.toLowerCase();
		filteredTasks = filteredTasks.filter(
			(task) =>
				task.issueTitle.toLowerCase().includes(searchLower) ||
				task.issueNumber.toString().includes(searchLower)
		);
	}

	if (from) {
		const fromTime = new Date(from).getTime();
		filteredTasks = filteredTasks.filter((task) => {
			const taskTime = task.completedAt ? new Date(task.completedAt).getTime() : 0;
			return taskTime >= fromTime;
		});
	}

	if (to) {
		const toTime = new Date(to).getTime();
		filteredTasks = filteredTasks.filter((task) => {
			const taskTime = task.completedAt ? new Date(task.completedAt).getTime() : 0;
			return taskTime <= toTime;
		});
	}

	// Sort by completion time (most recent first)
	filteredTasks.sort((a, b) => {
		const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
		const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
		return bTime - aTime;
	});

	// Pagination
	const total = filteredTasks.length;
	const paginatedTasks = filteredTasks.slice(offset, offset + limit);

	return json({
		tasks: paginatedTasks,
		total,
		limit,
		offset
	});
};
