import { json } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	updateIssueLabels,
	type PorterTaskMetadata
} from '$lib/server/github';
import { listAgents } from '$lib/server/store';
import { githubCache } from '$lib/server/cache';

const commandPattern = /@porter(?:\s+([^\s]+))?(.*)/i;

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
	const token = env.GITHUB_TOKEN;
	if (!token) {
		return json({ status: 'missing_token' }, { status: 500 });
	}

	const requestedAgent = match[1]?.trim();
	const flagText = match[2] ?? '';
	const priorityMatch = flagText.match(/--priority=(low|normal|high)/i);
	const priority = (priorityMatch?.[1] ?? 'normal') as PorterTaskMetadata['priority'];
	const agent = requestedAgent || 'opencode';
	const issue = payload.issue ?? {};
	const repo = payload.repository ?? {};

	const repoOwner = repo.owner?.login ?? 'unknown';
	const repoName = repo.name ?? 'unknown';
	const issueNumber = issue.number ?? 0;
	const agents = await listAgents(token);
	const agentInfo = agents.find((entry) => entry.name === agent);
	const isReady = agentInfo?.readyState === 'ready';
	const status: PorterTaskMetadata['status'] = isReady ? 'queued' : 'failed';
	const summary = isReady
		? 'Task queued'
		: agentInfo
			? `Task blocked: missing ${agentInfo.provider ?? 'provider'} credentials.`
			: 'Task blocked: unknown agent.';

	const metadata: PorterTaskMetadata = {
		taskId: `${repoOwner}/${repoName}#${issueNumber}`,
		agent,
		priority,
		status,
		progress: 0,
		createdAt: new Date().toISOString(),
		summary
	};

	const existingLabels = (issue.labels ?? []).map((label: { name?: string }) => label?.name ?? '');
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
	await updateIssueLabels(token, repoOwner, repoName, issueNumber, labels);
	const comment = buildPorterComment(summary, {
		...metadata,
		updatedAt: new Date().toISOString()
	});
	await addIssueComment(token, repoOwner, repoName, issueNumber, comment);

	// Clear cache so the new task appears immediately
	githubCache.clearPattern(`issues:${repoOwner}/${repoName}`);
	console.log(`[Webhook] Task created, cleared cache for ${repoOwner}/${repoName}`);

	return json({ status: 'accepted', taskId: metadata.taskId }, { status: 202 });
};
