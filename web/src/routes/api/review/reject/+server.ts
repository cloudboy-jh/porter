import { json } from '@sveltejs/kit';
import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	buildTaskFromIssue,
	fetchIssue,
	getLatestPorterMetadata,
	getPorterAgent,
	getPorterPriority,
	isGitHubAuthError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel,
	updateIssueLabels,
	type PorterTaskMetadata
} from '$lib/server/github';
import { clearSession } from '$lib/server/auth';
import { githubCache } from '$lib/server/cache';

const DEFAULT_REJECTION_SUMMARY = 'Rejected in review. Please revise and resubmit.';

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

const findTaskByIssue = async (
	token: string,
	repoOwner: string,
	repoName: string,
	issueNumber: number
) => {
	const issue = await fetchIssue(token, repoOwner, repoName, issueNumber);
	const comments = await listIssueComments(token, repoOwner, repoName, issueNumber);
	const metadata = getLatestPorterMetadata(comments);
	return buildTaskFromIssue(issue, repoOwner, repoName, metadata);
};

const applyRejectedStatus = async (
	token: string,
	repoOwner: string,
	repoName: string,
	issueNumber: number,
	summary: string
) => {
	const issue = await fetchIssue(token, repoOwner, repoName, issueNumber);
	const agent = getPorterAgent(issue.labels);
	const priority = getPorterPriority(issue.labels);
	const existingLabels = issue.labels.map((label) => label.name);
	const porterLabels = buildPorterLabels('failed', agent, priority);
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
	await updateIssueLabels(token, repoOwner, repoName, issueNumber, labels);

	const metadata: PorterTaskMetadata = {
		taskId: `${repoOwner}/${repoName}#${issueNumber}`,
		agent,
		priority,
		status: 'failed',
		progress: 100,
		createdAt: issue.created_at,
		updatedAt: new Date().toISOString(),
		summary,
		failureStage: 'pr'
	};

	await addIssueComment(token, repoOwner, repoName, issueNumber, buildPorterComment(summary, metadata));
	githubCache.clearPattern(`issues:${repoOwner}/${repoName}`);
};

export const POST = async ({
	request,
	locals,
	cookies
}: {
	request: Request;
	locals: App.Locals;
	cookies: import('@sveltejs/kit').Cookies;
}) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const payload = (await request.json()) as {
			taskId?: string;
			repoOwner?: string;
			repoName?: string;
			issueNumber?: number;
			summary?: string;
		};
		const issueNumber = payload.issueNumber ? Number(payload.issueNumber) : null;
		const hasDirectTarget = Boolean(payload.repoOwner && payload.repoName && issueNumber);
		if (!payload.taskId && !hasDirectTarget) {
			return json(
				{ error: 'taskId or repoOwner/repoName/issueNumber is required' },
				{ status: 400 }
			);
		}

		const task = hasDirectTarget
			? await findTaskByIssue(
					session.token,
					payload.repoOwner as string,
					payload.repoName as string,
					issueNumber as number
				)
			: await findTaskById(session.token, payload.taskId as string);

		if (!task || !task.prUrl) {
			return json({ error: 'task not reviewable' }, { status: 400 });
		}

		const summary = payload.summary?.trim() || DEFAULT_REJECTION_SUMMARY;
		await applyRejectedStatus(
			session.token,
			task.repoOwner,
			task.repoName,
			task.issueNumber,
			summary
		);

		return json({ rejected: true });
	} catch (error) {
		if (isGitHubAuthError(error)) {
			clearSession(cookies);
			return json({ error: 'unauthorized', action: 'reauth' }, { status: 401 });
		}
		console.error('Failed to reject review task:', error);
		return json({ error: 'reject failed' }, { status: 500 });
	}
};
