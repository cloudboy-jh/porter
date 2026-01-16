import { json } from '@sveltejs/kit';

import { createTask } from '$lib/server/store';
import type { TaskStatus } from '$lib/server/types';

const commandPattern = /@porter\s+(\S+)/i;

export const POST = async ({ request }: { request: Request }) => {
	const event = request.headers.get('x-github-event');
	if (event !== 'issue_comment') {
		return json({ status: 'ignored' }, { status: 202 });
	}
	const payload = (await request.json()) as Record<string, any>;
	const commentBody = payload.comment?.body ?? '';
	const match = commandPattern.exec(commentBody);
	if (!match) {
		return json({ status: 'ignored' }, { status: 202 });
	}
	const agent = match[1];
	const issue = payload.issue ?? {};
	const repo = payload.repository ?? {};
	const task = createTask({
		status: 'queued' as TaskStatus,
		repoOwner: repo.owner?.login ?? 'unknown',
		repoName: repo.name ?? 'unknown',
		issueNumber: issue.number ?? 0,
		issueTitle: issue.title ?? 'Untitled issue',
		issueBody: issue.body ?? '',
		agent,
		priority: 3,
		progress: 0,
		createdBy: payload.sender?.login ?? 'unknown'
	});
	return json({ status: 'accepted', taskId: task.id }, { status: 202 });
};
