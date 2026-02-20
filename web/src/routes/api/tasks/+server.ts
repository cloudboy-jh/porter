import { json } from '@sveltejs/kit';

import {
	buildTaskFromIssue,
	fetchIssue,
	getLatestPorterMetadata,
	getRateLimitStatus,
	isGitHubAuthError,
	isGitHubRateLimitError,
	normalizeGitHubError,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel
} from '$lib/server/github';
import type { TaskStatus } from '$lib/server/types';
import { dispatchTaskToFly } from '$lib/server/task-dispatch';
import { clearSession } from '$lib/server/auth';
import { githubCache } from '$lib/server/cache';
import { getConfig } from '$lib/server/store';
import { filterReposBySelection, isRepoSelectedByConfig } from '$lib/server/repo-selection';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const status = url.searchParams.get('status') as TaskStatus | null;
		const [{ repositories }, config] = await Promise.all([
			listInstallationRepos(session.token),
			getConfig(session.token, {
				githubUserId: session.user.id,
				githubLogin: session.user.login
			})
		]);
		const scopedRepos = filterReposBySelection(config, repositories);
		
		// Limit breadth to reduce GitHub API fan-out in production.
		const limitedRepos = scopedRepos.slice(0, 8);
		if (scopedRepos.length > 8) {
			console.warn(`[Rate Limit Protection] Limiting to 8 repos out of ${scopedRepos.length} total`);
		}
		
		// Process repos sequentially to avoid burst
		const allTasks = [];
		for (const repo of limitedRepos) {
			try {
				const issues = await listIssuesWithLabel(session.token, repo.owner, repo.name, 'open');
				// Limit issue fan-out per repository.
				const limitedIssues = issues.slice(0, 6);
				
				// Process issues sequentially to avoid burst
				for (const issue of limitedIssues) {
					try {
						const comments = await listIssueComments(session.token, repo.owner, repo.name, issue.number);
						const metadata = getLatestPorterMetadata(comments);
						const task = buildTaskFromIssue(issue, repo.owner, repo.name, metadata);
						allTasks.push(task);
					} catch (error) {
						console.error(`Failed to load task for issue ${repo.fullName}#${issue.number}:`, error);
					}
				}
			} catch (error) {
				if (isGitHubAuthError(error)) {
					throw error;
				}
				if (isGitHubRateLimitError(error)) {
					throw error;
				}
				console.error('Failed to load tasks for repo:', repo.fullName, error);
			}
		}

		const filtered = status ? allTasks.filter((task) => task.status === status) : allTasks;
		return json(filtered);
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			permissionFallbackMessage:
				'GitHub denied access. Update app permissions and re-accept installation access.',
			reconnectUrl: '/api/auth/github?force=1',
			defaultMessage: 'Failed to load tasks.'
		});
		if (normalized.error === 'unauthorized') {
			clearSession(cookies);
			return json(
				{ error: normalized.error, message: normalized.message, action: normalized.action },
				{ status: normalized.httpStatus }
			);
		}
		if (normalized.error === 'rate_limit') {
			const status = getRateLimitStatus();
			const resetDate = new Date(status.reset * 1000);
			const minutesUntil = Math.max(Math.ceil((status.reset * 1000 - Date.now()) / 60000), 0);
			return json(
				{
					error: normalized.error,
					message: normalized.message,
					resetAt: resetDate.toISOString(),
					minutesUntilReset: minutesUntil
				},
				{ status: normalized.httpStatus }
			);
		}
		if (normalized.error === 'missing_scope') {
			return json(
				{
					error: normalized.error,
					message: normalized.message,
					action: normalized.action,
					actionUrl: normalized.actionUrl,
					scopeHints: normalized.scopeHints
				},
				{ status: normalized.httpStatus }
			);
		}
		if (normalized.error === 'insufficient_permissions' || normalized.error === 'insufficient_app_permissions') {
			return json(
				{
					error: normalized.error,
					message: normalized.message,
					action: normalized.action,
					actionUrl: normalized.actionUrl
				},
				{ status: normalized.httpStatus }
			);
		}
		console.error('Failed to load tasks:', error);
		return json({ error: normalized.error, message: normalized.message }, { status: normalized.httpStatus });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const payload = (await request.json()) as Record<string, unknown>;
	const repoOwner = payload.repoOwner as string | undefined;
	const repoName = payload.repoName as string | undefined;
	const issueNumber = payload.issueNumber ? Number(payload.issueNumber) : null;
	const agent = (payload.agent as string | undefined) ?? 'opencode';
	const priority = (payload.priority as string | number | undefined) ?? 'normal';
	const prompt = (payload.prompt as string | undefined) ?? '';
	const issueBody = (payload.issueBody as string | undefined) ?? prompt;

	try {
		if (!repoOwner || !repoName) {
			return json({ error: 'repoOwner and repoName are required' }, { status: 400 });
		}

		if (issueNumber) {
			await fetchIssue(session.token, repoOwner, repoName, issueNumber);
		}

		const config = await getConfig(session.token, {
			githubUserId: session.user.id,
			githubLogin: session.user.login
		});
		if (!isRepoSelectedByConfig(config, { owner: repoOwner, name: repoName })) {
			return json(
				{
					error: 'repo_not_selected',
					message: 'Repository is not selected in Settings. Add it under Settings > Repositories first.'
				},
				{ status: 403 }
			);
		}

		const normalizedPriority =
			priority === 'low' || priority === 'high' || priority === 'normal'
				? priority
				: priority === 1
					? 'low'
					: priority === 3
						? 'high'
						: 'normal';

		const dispatchResult = await dispatchTaskToFly({
			githubToken: session.token,
			repoOwner,
			repoName,
			issueNumber: issueNumber ?? undefined,
			agent,
			priority: normalizedPriority,
			prompt,
			issueBody
		});

		if (!dispatchResult.ok) {
			const status = dispatchResult.summary.includes('missing callback') ? 500 : 400;
			return json({ error: dispatchResult.error ?? dispatchResult.summary }, { status });
		}

		// Clear cache for this repo's issues to reflect the new task
		githubCache.clearPattern(`issues:${repoOwner}/${repoName}`);

		const issue = await fetchIssue(session.token, repoOwner, repoName, dispatchResult.issueNumber);
		const comments = await listIssueComments(session.token, repoOwner, repoName, dispatchResult.issueNumber);
		const latestMetadata = getLatestPorterMetadata(comments);
		const task = buildTaskFromIssue(issue, repoOwner, repoName, latestMetadata);
		return json(task, { status: 201 });
	} catch (error) {
		const normalized = normalizeGitHubError(error, {
			permissionFallbackMessage:
				'GitHub denied access. Update app permissions and re-accept installation access.',
			reconnectUrl: '/api/auth/github?force=1',
			defaultMessage: 'Failed to create task.'
		});
		if (normalized.error === 'unauthorized') {
			clearSession(cookies);
			return json(
				{ error: normalized.error, message: normalized.message, action: normalized.action },
				{ status: normalized.httpStatus }
			);
		}
		if (normalized.error === 'missing_scope') {
			return json(
				{
					error: normalized.error,
					message: normalized.message,
					action: normalized.action,
					actionUrl: normalized.actionUrl,
					scopeHints: normalized.scopeHints
				},
				{ status: normalized.httpStatus }
			);
		}
		if (normalized.error === 'insufficient_permissions' || normalized.error === 'insufficient_app_permissions') {
			return json(
				{
					error: normalized.error,
					message: normalized.message,
					action: normalized.action,
					actionUrl: normalized.actionUrl
				},
				{ status: normalized.httpStatus }
			);
		}
		console.error('Failed to create task:', error);
		return json({ error: normalized.error, message: normalized.message }, { status: normalized.httpStatus });
	}
};
