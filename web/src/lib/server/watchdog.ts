import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	fetchIssue,
	updateIssueLabels,
	type PorterTaskMetadata
} from '$lib/server/github';
import { env } from '$env/dynamic/private';
import { destroyFlyMachine } from '$lib/server/fly';
import { githubCache } from '$lib/server/cache';
import {
	listRunningExecutionsOlderThan,
	markExecutionTerminal,
	removeExecutionContext
} from '$lib/server/execution';

const WATCHDOG_INTERVAL_MS = 60 * 1000;
const WATCHDOG_MAX_AGE_MS = 17 * 60 * 1000;

let started = false;

const stripOldPorterStatusLabels = (labels: string[]) =>
	labels.filter((label) => {
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

const processStaleExecution = async (execution: {
	executionId: string;
	owner: string;
	repo: string;
	issueNumber: number;
	agent: string;
	priority: 'low' | 'normal' | 'high';
	githubToken: string;
	machineId?: string;
	flyToken?: string;
	flyAppName?: string;
	createdAt: string;
}) => {
	const timeoutSummary = '❌ Porter failed: timeout after 15 minutes';

	if (execution.machineId && execution.flyToken && execution.flyAppName) {
		try {
			await destroyFlyMachine(execution.flyToken, execution.flyAppName, execution.machineId);
		} catch (error) {
			console.error(
				`[Watchdog] Failed to destroy machine ${execution.machineId} for ${execution.executionId}:`,
				error
			);
		}
	}

	try {
		const issue = await fetchIssue(
			execution.githubToken,
			execution.owner,
			execution.repo,
			execution.issueNumber
		);
		const existingLabels = issue.labels.map((label) => label.name);
		const porterLabels = buildPorterLabels('timed_out', execution.agent, execution.priority);
		const labels = Array.from(
			new Set([...stripOldPorterStatusLabels(existingLabels), ...porterLabels])
		);
		await updateIssueLabels(
			execution.githubToken,
			execution.owner,
			execution.repo,
			execution.issueNumber,
			labels
		);

		const metadata: PorterTaskMetadata = {
			taskId: `${execution.owner}/${execution.repo}#${execution.issueNumber}`,
			agent: execution.agent,
			priority: execution.priority,
			status: 'timed_out',
			progress: 100,
			createdAt: execution.createdAt,
			updatedAt: new Date().toISOString(),
			summary: timeoutSummary,
			failureStage: 'agent'
		};
		await addIssueComment(
			execution.githubToken,
			execution.owner,
			execution.repo,
			execution.issueNumber,
			buildPorterComment(timeoutSummary, metadata)
		);
		githubCache.clearPattern(`issues:${execution.owner}/${execution.repo}`);
	} catch (error) {
		console.error(`[Watchdog] Failed to update issue for stale execution ${execution.executionId}:`, error);
	}

	await markExecutionTerminal(execution.executionId, 'timed_out');
	await removeExecutionContext(execution.executionId);
};

const runWatchdogPass = async () => {
	const staleExecutions = await listRunningExecutionsOlderThan(WATCHDOG_MAX_AGE_MS);
	for (const execution of staleExecutions) {
		await processStaleExecution(execution);
	}
};

export const startTaskWatchdog = () => {
	if (env.NODE_ENV === 'test') return;
	if (started) return;
	started = true;
	void runWatchdogPass();
	const timer = setInterval(() => {
		void runWatchdogPass();
	}, WATCHDOG_INTERVAL_MS);
	timer.unref?.();
};
