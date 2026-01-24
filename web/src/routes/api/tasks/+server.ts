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
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel,
	updateIssueLabels
} from '$lib/server/github';
import type { PorterTaskMetadata } from '$lib/server/github';
import type { TaskStatus } from '$lib/server/types';

export const GET = async ({ url, locals }: { url: URL; locals: App.Locals }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const status = url.searchParams.get('status') as TaskStatus | null;
	const { repositories } = await listInstallationRepos(session.token);
	const tasks = await Promise.all(
		repositories.map(async (repo) => {
			try {
				const issues = await listIssuesWithLabel(session.token, repo.owner, repo.name, 'open');
				const mapped = await Promise.all(
					issues.map(async (issue) => {
						const comments = await listIssueComments(session.token, repo.owner, repo.name, issue.number);
						const metadata = getLatestPorterMetadata(comments);
						return buildTaskFromIssue(issue, repo.owner, repo.name, metadata);
					})
				);
				return mapped;
			} catch (error) {
				console.error('Failed to load tasks for repo:', repo.fullName, error);
				return [];
			}
		})
	);

	const flattened = tasks.flat();
	const filtered = status ? flattened.filter((task) => task.status === status) : flattened;
	return json(filtered);
};

export const POST = async ({ request, locals }: { request: Request; locals: App.Locals }) => {
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

	const comments = await listIssueComments(session.token, repoOwner, repoName, issue.number);
	const latestMetadata = getLatestPorterMetadata(comments);
	const task = buildTaskFromIssue(issue, repoOwner, repoName, latestMetadata);
	return json(task, { status: 201 });
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
