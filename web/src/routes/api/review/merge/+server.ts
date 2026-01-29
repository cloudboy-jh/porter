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
import type { RequestHandler } from './$types';

type GitHubRepo = {
	permissions?: { push?: boolean; admin?: boolean };
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
		if (!task || !task.prNumber || !task.prUrl) {
			return json({ error: 'task not reviewable' }, { status: 400 });
		}

		const repoResponse = await fetch(`https://api.github.com/repos/${task.repoOwner}/${task.repoName}`, {
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${session.token}`
			}
		});
		if (!repoResponse.ok) {
			return json({ error: 'failed to check permissions' }, { status: 500 });
		}
		const repoInfo = (await repoResponse.json()) as GitHubRepo;
		const canMerge = Boolean(repoInfo.permissions?.push || repoInfo.permissions?.admin);
		if (!canMerge) {
			return json({ error: 'missing merge permissions' }, { status: 403 });
		}

		const mergeResponse = await fetch(
			`https://api.github.com/repos/${task.repoOwner}/${task.repoName}/pulls/${task.prNumber}/merge`,
			{
				method: 'PUT',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${session.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			}
		);

		if (!mergeResponse.ok) {
			const body = await mergeResponse.json().catch(() => ({}));
			return json({ error: body?.message ?? 'merge failed' }, { status: mergeResponse.status });
		}

		const mergeResult = await mergeResponse.json();
		return json({ merged: true, result: mergeResult });
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to merge PR:', error);
		return json({ error: 'merge failed' }, { status: 500 });
	}
};
