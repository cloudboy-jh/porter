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
	callback_token?: string;
	base_branch?: string;
};

export const POST = async ({ request }: { request: Request }) => {
	const payload = (await request.json()) as CallbackPayload;
	const executionId = payload.execution_id ?? payload.task_id;
	if (!executionId) {
		return json({ error: 'missing execution id' }, { status: 400 });
	}

	const execution = getExecutionContext(executionId);
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

	if (!isSuccess) {
		const failedMetadata: PorterTaskMetadata = {
			taskId: `${execution.owner}/${execution.repo}#${execution.issueNumber}`,
			agent: execution.agent,
			priority: execution.priority,
			status: 'failed',
			progress: 100,
			createdAt: execution.createdAt,
			updatedAt: new Date().toISOString(),
			summary
		};
		await updateLabelsAndComment(execution.githubToken, execution.owner, execution.repo, execution.issueNumber, failedMetadata);
		consumeExecutionContext(executionId);
		githubCache.clearPattern(`issues:${execution.owner}/${execution.repo}`);
		return json({ ok: true });
	}

	const branchName = payload.branch_name?.trim() || execution.branchName;
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

	const successSummary = prUrl ? `Task complete. PR created: ${prUrl}` : `Task complete, but PR creation failed: ${String(prError)}`;
	const status: PorterTaskMetadata['status'] = prUrl ? 'success' : 'failed';
	const metadata: PorterTaskMetadata = {
		taskId: `${execution.owner}/${execution.repo}#${execution.issueNumber}`,
		agent: execution.agent,
		priority: execution.priority,
		status,
		progress: 100,
		createdAt: execution.createdAt,
		updatedAt: new Date().toISOString(),
		summary: prUrl ? successSummary : summary,
		prUrl,
		prNumber
	};

	await updateLabelsAndComment(execution.githubToken, execution.owner, execution.repo, execution.issueNumber, metadata);
	consumeExecutionContext(executionId);
	githubCache.clearPattern(`issues:${execution.owner}/${execution.repo}`);

	return json({ ok: true, prUrl, prNumber });
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
