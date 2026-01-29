import { redirect } from '@sveltejs/kit';
import {
	buildTaskFromIssue,
	getLatestPorterMetadata,
	isGitHubAuthError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel
} from '$lib/server/github';
import { clearSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

const PER_PAGE = 5;

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
	additions: number;
	deletions: number;
};

type GitHubRepo = {
	permissions?: { push?: boolean; admin?: boolean };
};

const parseLastPage = (linkHeader: string | null) => {
	if (!linkHeader) return 1;
	const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
	if (!match) return 1;
	return Number.parseInt(match[1], 10);
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

export const load: PageServerLoad = async ({ params, url, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		throw redirect(302, '/auth');
	}

	try {
		const taskId = params.taskId;
		const task = await findTaskById(session.token, taskId);
		if (!task || task.status !== 'success' || !task.prUrl || !task.prNumber) {
			throw redirect(302, '/review');
		}

		const owner = task.repoOwner;
		const repo = task.repoName;
		const prNumber = task.prNumber;
		const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);

		const [prResponse, repoResponse, filesResponse] = await Promise.all([
			fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${session.token}`
				}
			}),
			fetch(`https://api.github.com/repos/${owner}/${repo}`, {
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${session.token}`
				}
			}),
			fetch(
				`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${PER_PAGE}&page=${page}`,
				{
					headers: {
						Accept: 'application/vnd.github+json',
						Authorization: `Bearer ${session.token}`
					}
				}
			)
		]);

		if (!prResponse.ok || !repoResponse.ok || !filesResponse.ok) {
			throw new Error('Failed to load PR data');
		}

		const pr = (await prResponse.json()) as GitHubPull;
		const repoInfo = (await repoResponse.json()) as GitHubRepo;
		const files = (await filesResponse.json()) as GitHubPullFile[];
		const totalPages = parseLastPage(filesResponse.headers.get('link'));

		const diffUrls = files.map((file) => ({
			filename: file.filename,
			beforeUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${pr.base.sha}/${file.filename}`,
			afterUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${pr.head.sha}/${file.filename}`
		}));

		const canMerge = Boolean(repoInfo.permissions?.push || repoInfo.permissions?.admin);

		return {
			task,
			pr: {
				number: pr.number,
				htmlUrl: pr.html_url,
				additions: pr.additions,
				deletions: pr.deletions,
				mergeable: pr.mergeable,
				mergeableState: pr.mergeable_state ?? null
			},
			diffUrls,
			page,
			totalPages,
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
