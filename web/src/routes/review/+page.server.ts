import { redirect } from '@sveltejs/kit';
import {
	buildTaskFromIssue,
	fetchPullRequestFiles,
	getLatestPorterMetadata,
	isGitHubAuthError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel
} from '$lib/server/github';
import { clearSession } from '$lib/server/auth';
import { getConfig } from '$lib/server/store';
import { filterReposBySelection } from '$lib/server/repo-selection';
import type { Task } from '$lib/server/types';
import type { PageServerLoad } from './$types';

// Limit to prevent rate limit exhaustion
const MAX_REPOS_TO_CHECK = 10;
const MAX_ISSUES_PER_REPO = 20;

const getGitStats = async (token: string, owner: string, repo: string, prNumber?: number | null) => {
	if (!prNumber) return null;
	try {
		// Use cached version - only fetches first page (5 files) for stats
		const { files } = await fetchPullRequestFiles(token, owner, repo, prNumber, 1, 100);
		return files.reduce(
			(acc, file) => ({
				add: acc.add + file.additions,
				remove: acc.remove + file.deletions
			}),
			{ add: 0, remove: 0 }
		);
	} catch (error) {
		console.error(`Failed to get git stats for ${owner}/${repo}#${prNumber}:`, error);
		return null;
	}
};

// Process repos sequentially to avoid burst
const processRepo = async (
	token: string,
	repo: { owner: string; name: string; fullName: string }
): Promise<Task[]> => {
	try {
		const [openIssues, closedIssues] = await Promise.all([
			listIssuesWithLabel(token, repo.owner, repo.name, 'open'),
			listIssuesWithLabel(token, repo.owner, repo.name, 'closed')
		]);
		
		// Limit issues to prevent overload
		const issues = [...openIssues, ...closedIssues].slice(0, MAX_ISSUES_PER_REPO);
		
		// Process issues sequentially to avoid burst
		const tasks: Task[] = [];
		for (const issue of issues) {
			try {
				const comments = await listIssueComments(token, repo.owner, repo.name, issue.number);
				const metadata = getLatestPorterMetadata(comments);
				tasks.push(buildTaskFromIssue(issue, repo.owner, repo.name, metadata) as Task);
			} catch (error) {
				console.error(`Failed to process issue ${repo.fullName}#${issue.number}:`, error);
			}
		}
		
		return tasks;
	} catch (error) {
		if (isGitHubAuthError(error)) {
			throw error;
		}
		console.error('Failed to load review tasks for repo:', repo.fullName, error);
		return [];
	}
};

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		throw redirect(302, '/auth');
	}

	try {
		const [{ repositories }, config] = await Promise.all([
			listInstallationRepos(session.token),
			getConfig(session.token)
		]);
		const scopedRepos = filterReposBySelection(config, repositories);
		
		// Limit repos to prevent rate limit exhaustion
		const reposToCheck = scopedRepos.slice(0, MAX_REPOS_TO_CHECK);
		
		console.log(`[Review Page] Checking ${reposToCheck.length}/${scopedRepos.length} repos`);

		// Process repos sequentially to avoid burst
		const allTasks: Task[] = [];
		for (const repo of reposToCheck) {
			const tasks = await processRepo(session.token, repo);
			allTasks.push(...(tasks as Task[]));
		}

		const reviewable = allTasks.filter((task) => task.status === 'success' && Boolean(task.prUrl));

		console.log(`[Review Page] Found ${reviewable.length} reviewable tasks`);

		// Get stats for reviewable tasks (sequential to avoid burst)
		const reviewableWithStats: (Task & { git?: { add: number; remove: number } | null })[] = [];
		for (const task of reviewable) {
			const git = await getGitStats(session.token, task.repoOwner, task.repoName, task.prNumber);
			reviewableWithStats.push({ ...task, git });
		}

		return { reviewableTasks: reviewableWithStats };
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			throw redirect(302, '/auth');
		}
		console.error('Failed to load review tasks:', error);
		return { reviewableTasks: [] };
	}
};
