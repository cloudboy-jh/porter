import { json } from '@sveltejs/kit';

import {
	addIssueComment,
	buildPorterComment,
	buildPorterLabels,
	createPullRequest,
	fetchIssue,
	updateIssueLabels,
	type PorterTaskMetadata
} from '$lib/server/github';
import {
	consumeExecutionContext,
	getExecutionContext,
	verifyCallbackToken
} from '$lib/server/execution';
import { githubCache } from '$lib/server/cache';

type CallbackPayload = {
	task_id?: string;
	execution_id?: string;
	status?: 'complete' | 'success' | 'failed';
	summary?: string;
	error?: string;
	branch_name?: string;
	commit_hash?: string;
	callback_attempt?: number;
	callback_max_attempts?: number;
	callback_last_http_code?: number | string;
	callback_token?: string;
	base_branch?: string;
};

export const POST = async ({ request }: { request: Request }) => {
	const payload = (await request.json()) as CallbackPayload;
	const executionId = payload.execution_id ?? payload.task_id;
	if (!executionId) {
		return json({ error: 'missing execution id' }, { status: 400 });
	}

	const execution = await getExecutionContext(executionId);
	if (!execution) {
		return json({ error: 'unknown execution' }, { status: 404 });
	}

	const callbackToken =
		request.headers.get('x-porter-callback-token') ?? payload.callback_token ?? '';
	if (!callbackToken || !verifyCallbackToken(executionId, callbackToken)) {
		return json({ error: 'invalid callback token' }, { status: 401 });
	}

	const issue = await fetchIssue(
		execution.githubToken,
		execution.owner,
		execution.repo,
		execution.issueNumber
	);

	const isSuccess = payload.status === 'complete' || payload.status === 'success';
	const summary = payload.summary ?? (isSuccess ? 'Task complete.' : payload.error ?? 'Task failed.');
	const trimmedSummary = summary.trim();
	const branchName = payload.branch_name?.trim() || execution.branchName;
	const commitHash = payload.commit_hash?.trim() || undefined;
	const callbackAttempts = toPositiveInt(payload.callback_attempt);
	const callbackMaxAttempts = toPositiveInt(payload.callback_max_attempts);
	const callbackLastHttpCode = toPositiveInt(payload.callback_last_http_code);

	if (!isSuccess) {
		const failedMetadata: PorterTaskMetadata = {
			taskId: `${execution.owner}/${execution.repo}#${execution.issueNumber}`,
			agent: execution.agent,
			priority: execution.priority,
			status: 'failed',
			progress: 100,
			createdAt: execution.createdAt,
			updatedAt: new Date().toISOString(),
			summary,
			branchName,
			commitHash,
			callbackAttempts,
			callbackMaxAttempts,
			callbackLastHttpCode,
			failureStage: 'agent'
		};
		await updateLabelsAndComment(execution.githubToken, execution.owner, execution.repo, execution.issueNumber, failedMetadata);
		await consumeExecutionContext(executionId);
		githubCache.clearPattern(`issues:${execution.owner}/${execution.repo}`);
		return json({ ok: true });
	}

	const baseBranchCandidates = [payload.base_branch?.trim() || 'main', 'master'];

	let prUrl: string | undefined;
	let prNumber: number | undefined;
	let prError: unknown;

	for (const base of Array.from(new Set(baseBranchCandidates.filter(Boolean)))) {
		try {
			const pr = await createPullRequest(execution.githubToken, execution.owner, execution.repo, {
				title: `Fix #${execution.issueNumber}: ${issue.title}`,
				head: branchName,
				base,
				body: `Automated by Porter for issue #${execution.issueNumber}.`
			});
			prUrl = pr.html_url;
			prNumber = pr.number;
			prError = null;
			break;
		} catch (error) {
			prError = error;
		}
	}

	const formattedPrError = formatError(prError);
	const successSummary = prUrl
		? trimmedSummary
			? `${trimmedSummary}\n\nPR created: ${prUrl}`
			: `PR created: ${prUrl}`
		: trimmedSummary
			? `${trimmedSummary}\n\nPR creation failed: ${formattedPrError}`
			: `Task complete, but PR creation failed: ${formattedPrError}`;
	const status: PorterTaskMetadata['status'] = prUrl ? 'success' : 'failed';
	const metadata: PorterTaskMetadata = {
		taskId: `${execution.owner}/${execution.repo}#${execution.issueNumber}`,
		agent: execution.agent,
		priority: execution.priority,
		status,
		progress: 100,
		createdAt: execution.createdAt,
		updatedAt: new Date().toISOString(),
		summary: successSummary,
		prUrl,
		prNumber,
		branchName,
		commitHash,
		callbackAttempts,
		callbackMaxAttempts,
		callbackLastHttpCode,
		failureStage: prUrl ? undefined : 'pr'
	};

	await updateLabelsAndComment(execution.githubToken, execution.owner, execution.repo, execution.issueNumber, metadata);
	await consumeExecutionContext(executionId);
	githubCache.clearPattern(`issues:${execution.owner}/${execution.repo}`);

	return json({ ok: true, prUrl, prNumber });
};

const formatError = (error: unknown) => {
	if (!error) return 'unknown error';
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const toPositiveInt = (value: unknown) => {
	const numeric =
		typeof value === 'number'
			? value
			: typeof value === 'string' && /^\d+$/.test(value)
				? Number.parseInt(value, 10)
				: Number.NaN;
	if (!Number.isFinite(numeric)) return undefined;
	const parsed = Math.trunc(numeric);
	return parsed > 0 ? parsed : undefined;
};

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
