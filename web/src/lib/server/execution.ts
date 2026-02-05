import { createHmac, randomUUID } from 'crypto';
import { env } from '$env/dynamic/private';

import { createFlyMachine } from '$lib/server/fly';

type ExecutionPriority = 'low' | 'normal' | 'high';

export type ExecutionContext = {
	executionId: string;
	callbackToken: string;
	owner: string;
	repo: string;
	issueNumber: number;
	agent: string;
	priority: ExecutionPriority;
	prompt: string;
	branchName: string;
	githubToken: string;
	createdAt: string;
	machineId?: string;
};

type LaunchInput = {
	flyToken: string;
	flyAppName: string;
	callbackBaseUrl: string;
	anthropicKey?: string;
	ampKey?: string;
	openaiKey?: string;
};

const callbackSecret = env.CALLBACK_SECRET ?? env.SESSION_SECRET ?? 'porter-callback-secret';
const workerImage = env.PORTER_WORKER_IMAGE ?? 'registry.fly.io/porter-worker:latest';
const cpus = Number.parseInt(env.PORTER_MACHINE_CPUS ?? '2', 10);
const memoryMb = Number.parseInt(env.PORTER_MACHINE_MEMORY_MB ?? '2048', 10);

const pendingExecutions = new Map<string, ExecutionContext>();

const signCallbackToken = (executionId: string) =>
	createHmac('sha256', callbackSecret).update(executionId).digest('hex');

export const createExecutionContext = (input: {
	owner: string;
	repo: string;
	issueNumber: number;
	agent: string;
	priority: ExecutionPriority;
	prompt: string;
	githubToken: string;
}) => {
	const executionId = `task_${randomUUID()}`;
	const branchName = `porter/${executionId}`;
	const callbackToken = signCallbackToken(executionId);
	const context: ExecutionContext = {
		executionId,
		callbackToken,
		owner: input.owner,
		repo: input.repo,
		issueNumber: input.issueNumber,
		agent: input.agent,
		priority: input.priority,
		prompt: input.prompt,
		branchName,
		githubToken: input.githubToken,
		createdAt: new Date().toISOString()
	};
	pendingExecutions.set(executionId, context);
	return context;
};

export const getExecutionContext = (executionId: string) => pendingExecutions.get(executionId) ?? null;

export const consumeExecutionContext = (executionId: string) => {
	const existing = pendingExecutions.get(executionId) ?? null;
	if (existing) {
		pendingExecutions.delete(executionId);
	}
	return existing;
};

export const verifyCallbackToken = (executionId: string, token: string) => {
	const expected = signCallbackToken(executionId);
	return token === expected;
};

export const launchExecutionMachine = async (context: ExecutionContext, input: LaunchInput) => {
	const callbackUrl = `${input.callbackBaseUrl.replace(/\/$/, '')}/api/callbacks/complete`;
	const agentEnv: Record<string, string> = {};
	if (input.anthropicKey?.trim()) agentEnv.ANTHROPIC_API_KEY = input.anthropicKey.trim();
	if (input.ampKey?.trim()) agentEnv.AMP_API_KEY = input.ampKey.trim();
	if (input.openaiKey?.trim()) agentEnv.OPENAI_API_KEY = input.openaiKey.trim();
	const machine = await createFlyMachine(input.flyToken, input.flyAppName, {
		config: {
			image: workerImage,
			auto_destroy: true,
			env: {
				TASK_ID: context.executionId,
				REPO_FULL_NAME: `${context.owner}/${context.repo}`,
				ISSUE_NUMBER: String(context.issueNumber),
				AGENT: context.agent,
				PROMPT: context.prompt,
				BRANCH_NAME: context.branchName,
				GITHUB_TOKEN: context.githubToken,
				CALLBACK_URL: callbackUrl,
				CALLBACK_TOKEN: context.callbackToken,
				...agentEnv
			},
			guest: {
				cpu_kind: 'shared',
				cpus,
				memory_mb: memoryMb
			}
		}
	});

	const updated: ExecutionContext = { ...context, machineId: machine.id };
	pendingExecutions.set(context.executionId, updated);

	return machine;
};
