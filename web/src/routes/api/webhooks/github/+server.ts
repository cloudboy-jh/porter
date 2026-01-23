import { json } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

import { createTask } from '$lib/server/store';
import type { TaskStatus } from '$lib/server/types';

const commandPattern = /@porter\s+(\S+)/i;

const secret = env.WEBHOOK_SECRET;

const verifySignature = (payload: string, signature: string | null) => {
	if (!secret) return true;
	if (!signature) return false;
	const hmac = createHmac('sha256', secret);
	hmac.update(payload);
	const expected = `sha256=${hmac.digest('hex')}`;
	const expectedBuffer = Buffer.from(expected);
	const signatureBuffer = Buffer.from(signature);
	if (expectedBuffer.length !== signatureBuffer.length) return false;
	return timingSafeEqual(expectedBuffer, signatureBuffer);
};

export const POST = async ({ request }: { request: Request }) => {
	const event = request.headers.get('x-github-event');
	if (event !== 'issue_comment') {
		return json({ status: 'ignored' }, { status: 202 });
	}

	const rawBody = await request.text();
	const signature = request.headers.get('x-hub-signature-256');
	if (!verifySignature(rawBody, signature)) {
		return json({ status: 'invalid_signature' }, { status: 401 });
	}

	const payload = JSON.parse(rawBody) as Record<string, any>;
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
