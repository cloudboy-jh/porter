import { json } from '@sveltejs/kit';

import { createTask, listTasks } from '$lib/server/store';
import type { TaskStatus } from '$lib/server/types';

export const GET = ({ url }: { url: URL }) => {
	const status = url.searchParams.get('status') as TaskStatus | null;
	return json(listTasks(status ?? undefined));
};

export const POST = async ({ request }: { request: Request }) => {
	const payload = (await request.json()) as Record<string, unknown>;
	if (!payload.repoName) {
		return json({ error: 'repoName is required' }, { status: 400 });
	}
	const task = createTask({
		status: (payload.status as TaskStatus | undefined) ?? 'queued',
		repoOwner: (payload.repoOwner as string | undefined) ?? 'unknown',
		repoName: payload.repoName as string,
		issueNumber: Number(payload.issueNumber ?? 0),
		issueTitle: (payload.issueTitle as string | undefined) ?? 'Untitled issue',
		issueBody: (payload.issueBody as string | undefined) ?? '',
		agent: (payload.agent as string | undefined) ?? 'opencode',
		priority: Number(payload.priority ?? 3),
		progress: Number(payload.progress ?? 0),
		createdBy: (payload.createdBy as string | undefined) ?? 'unknown'
	});
	return json(task, { status: 201 });
};
