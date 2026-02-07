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
import { getConfig, listAgents } from '$lib/server/store';
import { createExecutionContext, launchExecutionMachine } from '$lib/server/execution';
import { githubCache } from '$lib/server/cache';

type DispatchPriority = 'low' | 'normal' | 'high';

type DispatchInput = {
	githubToken: string;
	repoOwner: string;
	repoName: string;
	issueNumber?: number;
	agent: string;
	priority: DispatchPriority;
	prompt?: string;
	issueBody?: string;
	issueTitle?: string;
	requireReadyAgent?: boolean;
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

export const dispatchTaskToFly = async (input: DispatchInput): Promise<DispatchResult> => {
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
		agent: input.agent,
		priority: input.priority,
		status: 'queued',
		progress: 0,
		createdAt: new Date().toISOString(),
		summary: 'Task queued'
	};

	await updateLabelsAndComment(input.githubToken, input.repoOwner, input.repoName, issue.number, metadata);

	if (input.requireReadyAgent) {
		const agents = await listAgents(input.githubToken);
		const agentInfo = agents.find((entry) => entry.name === input.agent);
		const isReady = agentInfo?.readyState === 'ready';
		if (!agentInfo || !isReady) {
			const blockedSummary = agentInfo
				? `Task blocked: missing ${agentInfo.provider ?? 'provider'} credentials.`
				: 'Task blocked: unknown agent.';
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
	}

	const activeConfig = await getConfig(input.githubToken);
	const flyToken = activeConfig.flyToken?.trim();
	const flyAppName = activeConfig.flyAppName?.trim();
	const anthropicKey = activeConfig.credentials?.anthropic?.trim();
	const callbackBaseUrl = env.PUBLIC_APP_URL ?? env.APP_URL;

	if (!flyToken || !flyAppName || !anthropicKey) {
		const blockedSummary = 'Task blocked: missing Fly setup or Anthropic API key.';
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

	if (!callbackBaseUrl) {
		const blockedSummary = 'Task blocked: missing callback base URL configuration.';
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
		const execution = createExecutionContext({
			owner: input.repoOwner,
			repo: input.repoName,
			issueNumber: issue.number,
			agent: input.agent,
			priority: input.priority,
			prompt: buildEnrichedPrompt(
				issue.title,
				issue.body ?? input.issueBody ?? prompt,
				issue.number,
				extraInstructions
			),
			githubToken: input.githubToken
		});

		const machine = await launchExecutionMachine(execution, {
			flyToken,
			flyAppName,
			callbackBaseUrl,
			anthropicKey,
			ampKey: activeConfig.credentials?.amp,
			openaiKey: activeConfig.credentials?.openai
		});

		const runningSummary = `Task running on Fly Machine ${machine.id}.`;
		await updateLabelsAndComment(input.githubToken, input.repoOwner, input.repoName, issue.number, {
			...metadata,
			status: 'running',
			progress: 10,
			updatedAt: new Date().toISOString(),
			summary: runningSummary,
			branchName: execution.branchName
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
		const failedSummary = 'Task failed to start on Fly Machines.';
		await updateLabelsAndComment(input.githubToken, input.repoOwner, input.repoName, issue.number, {
			...metadata,
			status: 'failed',
			progress: 100,
			updatedAt: new Date().toISOString(),
			summary: failedSummary,
			failureStage: 'dispatch'
		});
		console.error('Failed to launch Fly Machine:', error);
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
