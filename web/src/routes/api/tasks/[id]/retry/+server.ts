import { json } from '@sveltejs/kit';

import {
	fetchIssue,
	getPorterAgent,
	getPorterPriority
} from '$lib/server/github';
import { githubCache } from '$lib/server/cache';
import { getConfig } from '$lib/server/store';
import { dispatchTaskToDo } from '$lib/server/task-dispatch';

const parseTaskId = (id: string) => {
	const match = id.match(/^([^/]+)\/([^#]+)#(\d+)$/);
	if (!match) return null;
	return { owner: match[1], repo: match[2], issueNumber: Number(match[3]) };
};

const resolveRetryModel = (labelModel: string, selectedModel?: string) => {
	const normalized = labelModel.trim().toLowerCase();
	if (normalized === 'opencode' || normalized === 'claude' || normalized === 'claude-code') {
		return selectedModel?.trim() || 'anthropic/claude-sonnet-4';
	}
	if (normalized === 'amp') {
		return 'amp';
	}
	return labelModel;
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
	const config = await getConfig(session.token, {
		githubUserId: session.user.id,
		githubLogin: session.user.login
	});
	const model = resolveRetryModel(getPorterAgent(issue.labels), config.selectedModel);
	const priority = getPorterPriority(issue.labels);

	const result = await dispatchTaskToDo({
		githubToken: session.token,
		repoOwner: parsed.owner,
		repoName: parsed.repo,
		issueNumber: parsed.issueNumber,
		model,
		priority,
		issueBody: issue.body ?? '',
		issueTitle: issue.title
	});

	if (!result.ok) {
		const status = result.summary.includes('missing dispatch') ? 500 : 400;
		return json({ error: result.error ?? result.summary }, { status });
	}

	githubCache.clearPattern(`issues:${parsed.owner}/${parsed.repo}`);

	return json({ ok: true });
};
