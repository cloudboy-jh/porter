import { json } from '@sveltejs/kit';
import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	fetchIssue,
	updateIssueLabels
} from '$lib/server/github';
import type { PorterTaskMetadata, PorterTaskStatus } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request, locals }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const payload = (await request.json()) as Record<string, unknown>;
	const repoOwner = payload.repoOwner as string | undefined;
	const repoName = payload.repoName as string | undefined;
	const issueNumber = payload.issueNumber ? Number(payload.issueNumber) : null;
	const status = payload.status as PorterTaskStatus | undefined;
	const progress = payload.progress ? Number(payload.progress) : 0;
	const summary = (payload.summary as string | undefined) ?? 'Task update';
	const agent = (payload.agent as string | undefined) ?? 'opencode';
	const priority = (payload.priority as string | undefined) ?? 'normal';
	const prUrl = payload.prUrl as string | undefined;
	const prNumber = payload.prNumber ? Number(payload.prNumber) : undefined;

	if (!repoOwner || !repoName || !issueNumber || !status) {
		return json({ error: 'repoOwner, repoName, issueNumber, status are required' }, { status: 400 });
	}

	const issue = await fetchIssue(session.token, repoOwner, repoName, issueNumber);
	const existingLabels = issue.labels.map((label) => label.name);
	const porterLabels = buildPorterLabels(status, agent, priority);
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
	await updateIssueLabels(session.token, repoOwner, repoName, issueNumber, labels);

	const metadata: PorterTaskMetadata = {
		taskId: `${repoOwner}/${repoName}#${issueNumber}`,
		agent,
		priority: priority === 'low' || priority === 'high' || priority === 'normal' ? priority : 'normal',
		status,
		progress,
		createdAt: issue.created_at,
		updatedAt: new Date().toISOString(),
		summary,
		prUrl,
		prNumber
	};

	await addIssueComment(session.token, repoOwner, repoName, issueNumber, buildPorterComment(summary, metadata));

	return json({ ok: true });
};
