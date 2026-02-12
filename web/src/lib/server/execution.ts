import { createHmac, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
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
	baseBranch: string;
	githubToken: string;
	repoCloneUrl?: string;
	installationId?: number;
	flyToken?: string;
	flyAppName?: string;
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
const executionStorePath = env.PORTER_EXECUTION_STORE_PATH ?? join(tmpdir(), 'porter-executions.json');

const pendingExecutions = new Map<string, ExecutionContext>();
let storeLoaded = false;

const signCallbackToken = (executionId: string) =>
	createHmac('sha256', callbackSecret).update(executionId).digest('hex');

const loadExecutionStore = async () => {
	if (storeLoaded) return;
	storeLoaded = true;
	try {
		const raw = await fs.readFile(executionStorePath, 'utf8');
		const parsed = JSON.parse(raw) as ExecutionContext[];
		for (const item of parsed) {
			pendingExecutions.set(item.executionId, item);
		}
	} catch {
		// ignore missing or malformed store
	}
};

const persistExecutionStore = async () => {
	try {
		const serialized = JSON.stringify(Array.from(pendingExecutions.values()));
		await fs.writeFile(executionStorePath, serialized, 'utf8');
	} catch (error) {
		console.error('Failed to persist execution store:', error);
	}
};

export const createExecutionContext = (input: {
	owner: string;
	repo: string;
	issueNumber: number;
	agent: string;
	priority: ExecutionPriority;
	prompt: string;
	githubToken: string;
	repoCloneUrl?: string;
	baseBranch?: string;
	installationId?: number;
	flyToken?: string;
	flyAppName?: string;
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
		baseBranch: input.baseBranch?.trim() || 'main',
		githubToken: input.githubToken,
		repoCloneUrl: input.repoCloneUrl,
		installationId: input.installationId,
		flyToken: input.flyToken,
		flyAppName: input.flyAppName,
		createdAt: new Date().toISOString()
	};
	pendingExecutions.set(executionId, context);
	void persistExecutionStore();
	return context;
};

export const getExecutionContext = async (executionId: string) => {
	await loadExecutionStore();
	return pendingExecutions.get(executionId) ?? null;
};

export const consumeExecutionContext = async (executionId: string) => {
	await loadExecutionStore();
	const existing = pendingExecutions.get(executionId) ?? null;
	if (existing) {
		pendingExecutions.delete(executionId);
		await persistExecutionStore();
	}
	return existing;
};

export const listRunningExecutionsOlderThan = async (maxAgeMs: number) => {
	await loadExecutionStore();
	const cutoff = Date.now() - maxAgeMs;
	return Array.from(pendingExecutions.values()).filter((execution) => {
		if (!execution.machineId) return false;
		const startedAt = new Date(execution.createdAt).getTime();
		return Number.isFinite(startedAt) && startedAt < cutoff;
	});
};

export const removeExecutionContext = async (executionId: string) => {
	await loadExecutionStore();
	const existing = pendingExecutions.get(executionId) ?? null;
	if (existing) {
		pendingExecutions.delete(executionId);
		await persistExecutionStore();
	}
	return existing;
};

export const verifyCallbackToken = (executionId: string, token: string) => {
	const expected = signCallbackToken(executionId);
	return token === expected;
};

export const launchExecutionMachine = async (context: ExecutionContext, input: LaunchInput) => {
	await loadExecutionStore();
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
				REPO_URL:
					context.repoCloneUrl ??
					`https://x-access-token:${context.githubToken}@github.com/${context.owner}/${context.repo}.git`,
				ISSUE_NUMBER: String(context.issueNumber),
				AGENT: context.agent,
				PROMPT: context.prompt,
				BRANCH: context.branchName,
				BRANCH_NAME: context.branchName,
				BASE_BRANCH: context.baseBranch,
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
	await persistExecutionStore();

	return machine;
};
