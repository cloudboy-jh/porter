import { json } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

import {
	addIssueComment,
	addIssueCommentReaction,
	buildPorterComment,
	createInstallationAccessToken,
	fetchRepoFileContent,
	normalizeGitHubError,
	type PorterTaskMetadata
} from '$lib/server/github';
import { githubCache } from '$lib/server/cache';
import { parsePorterCommand } from '$lib/server/porter-command';
import { dispatchTaskToFly } from '$lib/server/task-dispatch';
import { getConfig } from '$lib/server/store';
import { isRepoSelectedByConfig } from '$lib/server/repo-selection';
import { getUserOAuthTokenByWebhookUser } from '$lib/server/oauth-tokens';
import { buildWrapPrompt } from '$lib/server/wrap';

const secret = env.WEBHOOK_SECRET;
const productionAllowlist = (env.PORTER_PRODUCTION_ALLOWLIST ?? '')
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

	const sender = String(payload.comment?.user?.login ?? '').toLowerCase();
	if (productionAllowlist.length > 0 && !productionAllowlist.includes(sender)) {
		return new Response('Not authorized', { status: 200 });
	}

	try {
		const issue = payload.issue ?? {};
		const repo = payload.repository ?? {};
		const installationId = Number(payload.installation?.id ?? 0);
		if (!installationId) {
			return json({ status: 'missing_installation' }, { status: 200 });
		}

		const oauthToken = await getUserOAuthTokenByWebhookUser({
			userId: Number(payload.comment?.user?.id ?? 0),
			login: payload.comment?.user?.login
		});
		if (!oauthToken) {
			return json({ status: 'missing_user_oauth' }, { status: 200 });
		}

		const activeConfig = await getConfig(oauthToken, {
			githubUserId: Number(payload.comment?.user?.id ?? 0) || undefined,
			githubLogin: payload.comment?.user?.login
		});
		const installationAuth = await createInstallationAccessToken(installationId);
		const installationToken = installationAuth.token;

		const repoOwner = repo.owner?.login ?? 'unknown';
		const repoName = repo.name ?? 'unknown';
		if (!isRepoSelectedByConfig(activeConfig, { owner: repoOwner, name: repoName })) {
			return json({ status: 'repo_not_selected' }, { status: 200 });
		}
		const issueNumber = issue.number ?? 0;
		const defaultAgent =
			activeConfig.onboarding?.enabledAgents?.[0] ??
			Object.entries(activeConfig.agents ?? {}).find(([, config]) => Boolean(config?.enabled))?.[0] ??
			'opencode';
		const agent = command.agentExplicit ? command.agent : defaultAgent;

		await addIssueCommentReaction(
			installationToken,
			repoOwner,
			repoName,
			Number(payload.comment?.id),
			'eyes'
		);

		const agentsMd = await fetchRepoFileContent(installationToken, repoOwner, repoName, 'AGENTS.md');
		const enrichedPrompt = buildWrapPrompt({
			issueTitle: issue.title ?? 'Untitled issue',
			issueBody: issue.body ?? '',
			issueNumber,
			agent,
			extraInstructions: command.extraInstructions,
			agentsMd
		});

		const repoUrl = `https://x-access-token:${installationToken}@github.com/${repoOwner}/${repoName}.git`;

		const dispatchResult = await dispatchTaskToFly({
			githubToken: installationToken,
			configToken: oauthToken,
			repoOwner,
			repoName,
			issueNumber,
			agent,
			priority: command.priority,
			prompt: command.extraInstructions,
			enrichedPrompt,
			issueBody: issue.body ?? '',
			issueTitle: issue.title,
			runtimeConfig: {
				flyToken: activeConfig.flyToken,
				flyAppName: activeConfig.flyAppName,
				credentials: activeConfig.credentials
			},
			installationId,
			repoCloneUrl: repoUrl,
			baseBranch: repo.default_branch ?? 'main',
			requireReadyAgent: true
		});

		if (!dispatchResult.ok) {
			const metadata: PorterTaskMetadata = {
				taskId: dispatchResult.taskId,
				agent,
				priority: command.priority,
				status: 'failed',
				progress: 100,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				summary: dispatchResult.summary
			};
			const comment = buildPorterComment(dispatchResult.summary, metadata);
			await addIssueComment(installationToken, repoOwner, repoName, issueNumber, comment);
		}

		githubCache.clearPattern(`issues:${repoOwner}/${repoName}`);
		console.log(`[Webhook] ${dispatchResult.status} task ${dispatchResult.taskId}`);

		return json({ status: 'accepted', taskId: dispatchResult.taskId }, { status: 202 });
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			reconnectUrl: '/api/auth/github?force=1',
			defaultMessage: 'Webhook task dispatch failed.'
		});
		if (normalized.error === 'failed') {
			console.error('Webhook dispatch failed:', error);
			return json({ status: 'failed', error: normalized.error, message: normalized.message }, { status: 500 });
		}
		return json(
			{
				status: 'rejected',
				error: normalized.error,
				message: normalized.message,
				action: normalized.action,
				actionUrl: normalized.actionUrl,
				scopeHints: normalized.scopeHints
			},
			{ status: 202 }
		);
	}
};
