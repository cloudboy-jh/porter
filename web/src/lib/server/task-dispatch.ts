import { env } from '$env/dynamic/private';

import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	createIssue,
	deriveIssueTitle,
	fetchIssue,
	updateIssueLabels,
	type PorterTaskMetadata
} from '$lib/server/github';
import { getConfig } from '$lib/server/store';
import { githubCache } from '$lib/server/cache';

type DispatchPriority = 'low' | 'normal' | 'high';

type DispatchInput = {
	githubToken: string;
	configToken?: string;
	repoOwner: string;
	repoName: string;
	issueNumber?: number;
	model: string;
	priority: DispatchPriority;
	prompt?: string;
	enrichedPrompt?: string;
	issueBody?: string;
	issueTitle?: string;
	installationId?: number;
	repoCloneUrl?: string;
	baseBranch?: string;
	runtimeConfig?: {
		credentials?: {
			anthropic?: string;
			openai?: string;
			amp?: string;
		};
	};
};

type DispatchResult = {
	ok: boolean;
	status: PorterTaskMetadata['status'];
	taskId: string;
	issueNumber: number;
	summary: string;
	error?: string;
};

const buildEnrichedPrompt = (title: string, body: string, issueNumber: number, extraInstructions = '') => `## Task
${title}

## Description
${body}

## Instructions
Complete this GitHub issue by making the necessary code changes.
Create a branch and commit your changes.
Do not create a PR; Porter will open the PR after completion.
Reference issue #${issueNumber} in commit messages where appropriate.
${extraInstructions ? `\n## Additional instructions\n${extraInstructions}\n` : ''}`;

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
		if (lower.startsWith('porter:timed_out')) return false;
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

export const dispatchTaskToDo = async (input: DispatchInput): Promise<DispatchResult> => {
	const prompt = input.prompt ?? '';
	if (!input.repoOwner || !input.repoName) {
		return {
			ok: false,
			status: 'failed',
			taskId: `${input.repoOwner}/${input.repoName}#0`,
			issueNumber: 0,
			summary: 'Task blocked: repository is required.',
			error: 'repoOwner and repoName are required'
		};
	}

	if (!input.issueNumber && !prompt) {
		return {
			ok: false,
			status: 'failed',
			taskId: `${input.repoOwner}/${input.repoName}#0`,
			issueNumber: 0,
			summary: 'Task blocked: issue number or prompt is required.',
			error: 'issueNumber or prompt is required'
		};
	}

	let issue = null;
	if (input.issueNumber) {
		issue = await fetchIssue(input.githubToken, input.repoOwner, input.repoName, input.issueNumber);
	} else {
		const derivedTitle = deriveIssueTitle(prompt);
		issue = await createIssue(
			input.githubToken,
			input.repoOwner,
			input.repoName,
			input.issueTitle ?? derivedTitle,
			input.issueBody ?? prompt
		);
	}

	const metadata: PorterTaskMetadata = {
		taskId: `${input.repoOwner}/${input.repoName}#${issue.number}`,
		agent: input.model,
		priority: input.priority,
		status: 'queued',
		progress: 0,
		createdAt: new Date().toISOString(),
		summary: 'Task queued'
	};

	await updateLabelsAndComment(input.githubToken, input.repoOwner, input.repoName, issue.number, metadata);

	const configLookupToken = input.configToken ?? input.githubToken;
	const activeConfig = input.runtimeConfig ? null : await getConfig(configLookupToken);
	const model = (input.model || activeConfig?.selectedModel || 'anthropic/claude-sonnet-4').trim();
	const hasCredentials = Object.keys(activeConfig?.providerCredentials ?? {}).length > 0;

	if (!hasCredentials) {
		const blockedSummary = 'Task blocked: missing provider API keys.';
		await updateLabelsAndComment(input.githubToken, input.repoOwner, input.repoName, issue.number, {
			...metadata,
			status: 'failed',
			summary: blockedSummary,
			updatedAt: new Date().toISOString()
		});
		return {
			ok: false,
			status: 'failed',
			taskId: metadata.taskId,
			issueNumber: issue.number,
			summary: blockedSummary,
			error: blockedSummary
		};
	}

	try {
		const extraInstructions = input.issueNumber ? prompt : '';
		const resolvedPrompt =
			input.enrichedPrompt ??
			buildEnrichedPrompt(
				issue.title,
				issue.body ?? input.issueBody ?? prompt,
				issue.number,
				extraInstructions
			);
		const dispatchUrl = env.PORTER_DO_DISPATCH_URL?.trim();
		if (dispatchUrl) {
			await fetch(dispatchUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.PORTER_DO_DISPATCH_TOKEN ?? ''}`
				},
				body: JSON.stringify({
					taskId: metadata.taskId,
					repoOwner: input.repoOwner,
					repoName: input.repoName,
					issueNumber: issue.number,
					priority: input.priority,
					model,
					prompt: resolvedPrompt,
					baseBranch: input.baseBranch ?? 'main',
					installationId: input.installationId
				})
			});
		}

		const runningSummary = `Task running in Durable Object with model ${model}.`;
		await updateLabelsAndComment(input.githubToken, input.repoOwner, input.repoName, issue.number, {
			...metadata,
			agent: model,
			status: 'running',
			progress: 10,
			updatedAt: new Date().toISOString(),
			summary: runningSummary
		});

		githubCache.clearPattern(`issues:${input.repoOwner}/${input.repoName}`);

		return {
			ok: true,
			status: 'running',
			taskId: metadata.taskId,
			issueNumber: issue.number,
			summary: runningSummary
		};
	} catch (error) {
		const failedSummary = 'Task failed to start in Durable Object runtime.';
		await updateLabelsAndComment(input.githubToken, input.repoOwner, input.repoName, issue.number, {
			...metadata,
			status: 'failed',
			progress: 100,
			updatedAt: new Date().toISOString(),
			summary: failedSummary,
			failureStage: 'dispatch'
		});
		console.error('Failed to dispatch task:', error);
		return {
			ok: false,
			status: 'failed',
			taskId: metadata.taskId,
			issueNumber: issue.number,
			summary: failedSummary,
			error: failedSummary
		};
	}
};
