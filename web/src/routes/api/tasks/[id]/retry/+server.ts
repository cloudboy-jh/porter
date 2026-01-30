import { json } from '@sveltejs/kit';

import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	fetchIssue,
	getPorterAgent,
	getPorterPriority,
	updateIssueLabels
} from '$lib/server/github';
import type { PorterTaskMetadata } from '$lib/server/github';
import { githubCache } from '$lib/server/cache';

const parseTaskId = (id: string) => {
	const match = id.match(/^([^/]+)\/([^#]+)#(\d+)$/);
	if (!match) return null;
	return { owner: match[1], repo: match[2], issueNumber: Number(match[3]) };
};

export const PUT = async ({ params, locals }: { params: { id: string }; locals: App.Locals }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const decodedId = decodeURIComponent(params.id);
	const parsed = parseTaskId(decodedId);
	if (!parsed) {
		return json({ error: 'invalid task id' }, { status: 400 });
	}

	const issue = await fetchIssue(session.token, parsed.owner, parsed.repo, parsed.issueNumber);
	const agent = getPorterAgent(issue.labels);
	const priority = getPorterPriority(issue.labels);
	const existingLabels = issue.labels.map((label) => label.name);
	const porterLabels = buildPorterLabels('queued', agent, priority);
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
	await updateIssueLabels(session.token, parsed.owner, parsed.repo, parsed.issueNumber, labels);

	const metadata: PorterTaskMetadata = {
		taskId: `${parsed.owner}/${parsed.repo}#${parsed.issueNumber}`,
		agent,
		priority,
		status: 'queued',
		progress: 0,
		createdAt: issue.created_at,
		updatedAt: new Date().toISOString(),
		summary: 'Retry requested'
	};

	await addIssueComment(
		session.token,
		parsed.owner,
		parsed.repo,
		parsed.issueNumber,
		buildPorterComment('Retry requested', metadata)
	);

	// Clear cache for this repo's issues to reflect the status change
	githubCache.clearPattern(`issues:${parsed.owner}/${parsed.repo}`);

	return json({ ok: true });
};
