import { redirect } from '@sveltejs/kit';
import {
	buildTaskFromIssue,
	fetchGitHub,
	getLatestPorterMetadata,
	isGitHubAuthError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel
} from '$lib/server/github';
import { clearSession } from '$lib/server/auth';
import type { Task } from '$lib/server/types';
import type { PageServerLoad } from './$types';

type GitHubPrFile = { additions: number; deletions: number };

const getGitStats = async (token: string, owner: string, repo: string, prNumber?: number | null) => {
	if (!prNumber) return null;
	const files = await fetchGitHub<GitHubPrFile[]>(
		`/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
		token
	);
	return files.reduce(
		(acc, file) => ({
			add: acc.add + file.additions,
			remove: acc.remove + file.deletions
		}),
		{ add: 0, remove: 0 }
	);
};

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		throw redirect(302, '/auth');
	}

	try {
		const { repositories } = await listInstallationRepos(session.token);
		const tasks = await Promise.all(
			repositories.map(async (repo) => {
				try {
					const [openIssues, closedIssues] = await Promise.all([
						listIssuesWithLabel(session.token, repo.owner, repo.name, 'open'),
						listIssuesWithLabel(session.token, repo.owner, repo.name, 'closed')
					]);
					const issues = [...openIssues, ...closedIssues];
					const mapped = await Promise.all(
						issues.map(async (issue) => {
							const comments = await listIssueComments(session.token, repo.owner, repo.name, issue.number);
							const metadata = getLatestPorterMetadata(comments);
							return buildTaskFromIssue(issue, repo.owner, repo.name, metadata);
						})
					);
					return mapped;
				} catch (error) {
					if (isGitHubAuthError(error)) {
						throw error;
					}
					console.error('Failed to load review tasks for repo:', repo.fullName, error);
					return [];
				}
			})
		);

		const reviewable = tasks
			.flat()
			.filter((task) => task.status === 'success' && Boolean(task.prUrl));

		const reviewableWithStats = await Promise.all(
			reviewable.map(async (task) => {
				const git = await getGitStats(session.token, task.repoOwner, task.repoName, task.prNumber);
				return { ...task, git } as Task & { git?: { add: number; remove: number } | null };
			})
		);

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
