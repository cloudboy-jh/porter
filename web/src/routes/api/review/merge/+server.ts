import { json } from '@sveltejs/kit';
import {
	buildTaskFromIssue,
	fetchRepo,
	getLatestPorterMetadata,
	isGitHubAuthError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel,
	mergePullRequest
} from '$lib/server/github';
import { clearSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const parsePRNumberFromUrl = (prUrl?: string) => {
	if (!prUrl) return null;
	const match = prUrl.match(/\/pull\/(\d+)(?:$|[/?#])/);
	if (!match) return null;
	const value = Number.parseInt(match[1], 10);
	return Number.isFinite(value) ? value : null;
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

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const payload = (await request.json()) as { taskId?: string };
		if (!payload.taskId) {
			return json({ error: 'taskId is required' }, { status: 400 });
		}
		const task = await findTaskById(session.token, payload.taskId);
		if (!task || !task.prUrl) {
			return json({ error: 'task not reviewable' }, { status: 400 });
		}

		const prNumber = task.prNumber ?? parsePRNumberFromUrl(task.prUrl);
		if (!prNumber) {
			return json({ error: 'pull request number missing' }, { status: 400 });
		}

		const repoInfo = await fetchRepo(session.token, task.repoOwner, task.repoName);
		const canMerge = Boolean(repoInfo.permissions?.push || repoInfo.permissions?.admin);
		if (!canMerge) {
			return json({ error: 'missing merge permissions' }, { status: 403 });
		}

		const mergeResult = await mergePullRequest(
			session.token,
			task.repoOwner,
			task.repoName,
			prNumber
		);

		if (!mergeResult.merged) {
			return json({ error: mergeResult.message ?? 'merge failed' }, { status: 500 });
		}

		return json({ merged: true, sha: mergeResult.sha });
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to merge PR:', error);
		return json({ error: 'merge failed' }, { status: 500 });
	}
};
