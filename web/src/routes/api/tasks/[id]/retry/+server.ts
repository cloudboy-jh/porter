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
import { getConfig } from '$lib/server/store';
import { createExecutionContext, launchExecutionMachine } from '$lib/server/execution';
import { githubCache } from '$lib/server/cache';
import { env } from '$env/dynamic/private';

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

	const config = await getConfig(session.token);
	const flyToken = config.flyToken?.trim();
	const flyAppName = config.flyAppName?.trim();
	const anthropicKey = config.credentials?.anthropic?.trim();
	const callbackBaseUrl = env.PUBLIC_APP_URL ?? env.APP_URL;

	if (!flyToken || !flyAppName || !anthropicKey || !callbackBaseUrl) {
		const failedMetadata: PorterTaskMetadata = {
			...metadata,
			status: 'failed',
			progress: 100,
			updatedAt: new Date().toISOString(),
			summary: 'Retry blocked: missing Fly setup or Anthropic API key.'
		};
		const failedLabels = Array.from(
			new Set([...cleanedLabels, ...buildPorterLabels('failed', agent, priority)])
		);
		await updateIssueLabels(session.token, parsed.owner, parsed.repo, parsed.issueNumber, failedLabels);
		await addIssueComment(
			session.token,
			parsed.owner,
			parsed.repo,
			parsed.issueNumber,
			buildPorterComment(failedMetadata.summary ?? 'Retry failed', failedMetadata)
		);
		return json({ error: failedMetadata.summary }, { status: 400 });
	}

	try {
		const execution = createExecutionContext({
			owner: parsed.owner,
			repo: parsed.repo,
			issueNumber: parsed.issueNumber,
			agent,
			priority,
			prompt: buildEnrichedPrompt(issue.title, issue.body ?? '', parsed.issueNumber),
			githubToken: session.token
		});

		const machine = await launchExecutionMachine(execution, {
			flyToken,
			flyAppName,
			callbackBaseUrl,
			anthropicKey,
			ampKey: config.credentials?.amp,
			openaiKey: config.credentials?.openai
		});

		const running: PorterTaskMetadata = {
			...metadata,
			status: 'running',
			progress: 10,
			updatedAt: new Date().toISOString(),
			summary: `Task running on Fly Machine ${machine.id}.`
		};
		const runningLabels = Array.from(
			new Set([...cleanedLabels, ...buildPorterLabels('running', agent, priority)])
		);
		await updateIssueLabels(session.token, parsed.owner, parsed.repo, parsed.issueNumber, runningLabels);
		await addIssueComment(
			session.token,
			parsed.owner,
			parsed.repo,
			parsed.issueNumber,
			buildPorterComment(running.summary ?? 'Task running', running)
		);
	} catch (error) {
		const failed: PorterTaskMetadata = {
			...metadata,
			status: 'failed',
			progress: 100,
			updatedAt: new Date().toISOString(),
			summary: 'Retry failed to start on Fly Machines.'
		};
		const failedLabels = Array.from(
			new Set([...cleanedLabels, ...buildPorterLabels('failed', agent, priority)])
		);
		await updateIssueLabels(session.token, parsed.owner, parsed.repo, parsed.issueNumber, failedLabels);
		await addIssueComment(
			session.token,
			parsed.owner,
			parsed.repo,
			parsed.issueNumber,
			buildPorterComment(failed.summary ?? 'Retry failed', failed)
		);
		console.error('Retry machine launch failed:', error);
		return json({ error: failed.summary }, { status: 500 });
	}

	// Clear cache for this repo's issues to reflect the status change
	githubCache.clearPattern(`issues:${parsed.owner}/${parsed.repo}`);

	return json({ ok: true });
};

const buildEnrichedPrompt = (title: string, body: string, issueNumber: number) => `## Task
${title}

## Description
${body}

## Instructions
Complete this GitHub issue by making the necessary code changes.
Create a branch and commit your changes.
Do not create a PR; Porter will open the PR after completion.
Reference issue #${issueNumber} in commit messages where appropriate.
`;
