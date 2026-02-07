import { json } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

import {
	addIssueComment,
	buildPorterComment,
	type PorterTaskMetadata
} from '$lib/server/github';
import { githubCache } from '$lib/server/cache';
import { parsePorterCommand } from '$lib/server/porter-command';
import { dispatchTaskToFly } from '$lib/server/task-dispatch';

const secret = env.WEBHOOK_SECRET;
const productionAllowlist = (env.PORTER_PRODUCTION_ALLOWLIST ?? 'cloudboy-jh')
	.split(',')
	.map((value) => value.trim().toLowerCase())
	.filter(Boolean);

const verifySignature = (payload: string, signature: string | null) => {
	if (!secret) return true;
	if (!signature) return false;
	const hmac = createHmac('sha256', secret);
	hmac.update(payload);
	const expected = `sha256=${hmac.digest('hex')}`;
	const expectedBuffer = Uint8Array.from(Buffer.from(expected));
	const signatureBuffer = Uint8Array.from(Buffer.from(signature));
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
	const command = parsePorterCommand(commentBody);
	if (!command) {
		return json({ status: 'ignored' }, { status: 202 });
	}

	if (payload.action !== 'created') {
		return json({ status: 'ignored' }, { status: 202 });
	}

	if (payload.comment?.user?.type === 'Bot') {
		return json({ status: 'ignored' }, { status: 202 });
	}

	const token = env.GITHUB_TOKEN;
	if (!token) {
		return json({ status: 'missing_token' }, { status: 500 });
	}

	const sender = String(payload.comment?.user?.login ?? '').toLowerCase();
	if (productionAllowlist.length > 0 && !productionAllowlist.includes(sender)) {
		const repo = payload.repository ?? {};
		const issue = payload.issue ?? {};
		const repoOwner = repo.owner?.login ?? 'unknown';
		const repoName = repo.name ?? 'unknown';
		const issueNumber = issue.number ?? 0;
		const blockedSummary = 'Task blocked: production webhook execution is currently allowlisted.';
		const metadata: PorterTaskMetadata = {
			taskId: `${repoOwner}/${repoName}#${issueNumber}`,
			agent: command.agent,
			priority: command.priority,
			status: 'failed',
			progress: 100,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			summary: blockedSummary
		};
		const comment = buildPorterComment(blockedSummary, metadata);
		await addIssueComment(token, repoOwner, repoName, issueNumber, comment);
		return json({ status: 'allowlist_blocked' }, { status: 202 });
	}

	const issue = payload.issue ?? {};
	const repo = payload.repository ?? {};

	const repoOwner = repo.owner?.login ?? 'unknown';
	const repoName = repo.name ?? 'unknown';
	const issueNumber = issue.number ?? 0;

	const dispatchResult = await dispatchTaskToFly({
		githubToken: token,
		repoOwner,
		repoName,
		issueNumber,
		agent: command.agent,
		priority: command.priority,
		prompt: command.extraInstructions,
		issueBody: issue.body ?? '',
		issueTitle: issue.title,
		requireReadyAgent: true
	});

	// Clear cache so the new task appears immediately
	githubCache.clearPattern(`issues:${repoOwner}/${repoName}`);
	console.log(`[Webhook] ${dispatchResult.status} task ${dispatchResult.taskId}`);

	return json({ status: 'accepted', taskId: dispatchResult.taskId }, { status: 202 });
};
