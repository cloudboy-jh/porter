import { redirect } from '@sveltejs/kit';
import {
	buildTaskFromIssue,
	fetchPullRequest,
	fetchPullRequestFiles,
	fetchRepo,
	getLatestPorterMetadata,
	isGitHubAuthError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel
} from '$lib/server/github';
import { clearSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

const PER_PAGE = 100;

const parsePRNumberFromUrl = (prUrl?: string) => {
	if (!prUrl) return null;
	const match = prUrl.match(/\/pull\/(\d+)(?:$|[/?#])/);
	if (!match) return null;
	const value = Number.parseInt(match[1], 10);
	return Number.isFinite(value) ? value : null;
};

const inferLanguage = (filename: string) => {
	const name = filename.toLowerCase();
	if (name.endsWith('.ts')) return 'typescript';
	if (name.endsWith('.tsx')) return 'tsx';
	if (name.endsWith('.js')) return 'javascript';
	if (name.endsWith('.jsx')) return 'jsx';
	if (name.endsWith('.svelte')) return 'svelte';
	if (name.endsWith('.json')) return 'json';
	if (name.endsWith('.css')) return 'css';
	if (name.endsWith('.md')) return 'markdown';
	if (name.endsWith('.py')) return 'python';
	if (name.endsWith('.go')) return 'go';
	if (name.endsWith('.rs')) return 'rust';
	if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'yaml';
	if (name.endsWith('dockerfile')) return 'dockerfile';
	return 'text';
};

const fetchRawContent = async (
	token: string,
	owner: string,
	repo: string,
	sha: string,
	path: string
) => {
	const response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
	if (!response.ok) return null;
	return response.text();
};

const findTaskById = async (token: string, taskId: string) => {
	const { repositories } = await listInstallationRepos(token);
	for (const repo of repositories) {
		const [openIssues, closedIssues] = await Promise.all([
			listIssuesWithLabel(token, repo.owner, repo.name, 'open'),
			listIssuesWithLabel(token, repo.owner, repo.name, 'closed')
		]);
		const issues = [...openIssues, ...closedIssues];
		for (const issue of issues) {
			const comments = await listIssueComments(token, repo.owner, repo.name, issue.number);
			const metadata = getLatestPorterMetadata(comments);
			const task = buildTaskFromIssue(issue, repo.owner, repo.name, metadata);
			if (task.id === taskId) return task;
		}
	}
	return null;
};

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		throw redirect(302, '/auth');
	}

	try {
		const taskId = params.taskId;
		const task = await findTaskById(session.token, taskId);
		if (!task || task.status !== 'success' || !task.prUrl) {
			throw redirect(302, '/review');
		}

		const owner = task.repoOwner;
		const repo = task.repoName;
		const prNumber = task.prNumber ?? parsePRNumberFromUrl(task.prUrl);
		if (!prNumber) {
			throw redirect(302, '/review');
		}

		const [pr, repoInfo, { files }] = await Promise.all([
			fetchPullRequest(session.token, owner, repo, prNumber),
			fetchRepo(session.token, owner, repo),
			fetchPullRequestFiles(session.token, owner, repo, prNumber, 1, PER_PAGE)
		]);

		const diffFiles = await Promise.all(
			files.map(async (file) => {
				const status = file.status ?? 'modified';
				const beforePath = file.previous_filename ?? file.filename;

				const beforeContent =
					status === 'added'
						? null
						: await fetchRawContent(session.token, owner, repo, pr.base.sha, beforePath);

				const afterContent =
					status === 'removed'
						? null
						: await fetchRawContent(session.token, owner, repo, pr.head.sha, file.filename);

				return {
					filename: file.filename,
					status,
					additions: file.additions,
					deletions: file.deletions,
					language: inferLanguage(file.filename),
					beforeContent,
					afterContent
				};
			})
		);

		const diffStats = diffFiles.reduce(
			(acc, file) => ({
				additions: acc.additions + file.additions,
				deletions: acc.deletions + file.deletions
			}),
			{ additions: 0, deletions: 0 }
		);

		const canMerge = Boolean(repoInfo.permissions?.push || repoInfo.permissions?.admin);

		return {
			task,
			pr: {
				number: pr.number,
				htmlUrl: pr.html_url,
				additions: diffStats.additions,
				deletions: diffStats.deletions,
				mergeable: pr.mergeable,
				mergeableState: pr.mergeable_state ?? null
			},
			files: diffFiles,
			canMerge
		};
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			throw redirect(302, '/auth');
		}
		console.error('Failed to load review detail:', error);
		throw redirect(302, '/review');
	}
};
