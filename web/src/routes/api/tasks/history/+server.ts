import { json } from '@sveltejs/kit';

import {
	buildTaskFromIssue,
	getLatestPorterMetadata,
	listInstallationRepos,
	listIssueComments,
	listIssuesWithLabel
} from '$lib/server/github';

export const GET = async ({ url, locals }: { url: URL; locals: App.Locals }) => {
	const session = locals.session;
	if (!session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const status = url.searchParams.get('status');
	const agent = url.searchParams.get('agent');
	const repo = url.searchParams.get('repo');
	const branch = url.searchParams.get('branch');
	const issueNumber = url.searchParams.get('issueNumber');
	const search = url.searchParams.get('search');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

	const { repositories } = await listInstallationRepos(session.token);
	const tasks = await Promise.all(
		repositories.map(async (repo) => {
			try {
				const [openIssues, closedIssues] = await Promise.all([
					listIssuesWithLabel(session.token, repo.owner, repo.name, 'open'),
					listIssuesWithLabel(session.token, repo.owner, repo.name, 'closed')
				]);
				const issues = [...openIssues, ...closedIssues];
				const mapped = await Promise.all(
					issues.map(async (issue) => {
						const comments = await listIssueComments(session.token, repo.owner, repo.name, issue.number);
						const metadata = getLatestPorterMetadata(comments);
						return buildTaskFromIssue(issue, repo.owner, repo.name, metadata);
					})
				);
				return mapped;
			} catch (error) {
				console.error('Failed to load history for repo:', repo.fullName, error);
				return [];
			}
		})
	);

	let filteredTasks = tasks.flat();

	// Apply filters
	if (status && (status === 'success' || status === 'failed')) {
		filteredTasks = filteredTasks.filter((task) => task.status === status);
	}

	if (agent) {
		filteredTasks = filteredTasks.filter((task) => task.agent === agent);
	}

	if (repo) {
		filteredTasks = filteredTasks.filter(
			(task) => `${task.repoOwner}/${task.repoName}`.toLowerCase().includes(repo.toLowerCase())
		);
	}

	if (branch) {
		filteredTasks = filteredTasks.filter((task) => {
			const taskBranch = (task as any).branch;
			return taskBranch?.toLowerCase() === branch.toLowerCase();
		});
	}

	if (issueNumber) {
		const issueNum = parseInt(issueNumber);
		if (!isNaN(issueNum)) {
			filteredTasks = filteredTasks.filter((task) => task.issueNumber === issueNum);
		}
	}

	if (search) {
		const searchLower = search.toLowerCase();
		filteredTasks = filteredTasks.filter(
			(task) =>
				task.issueTitle.toLowerCase().includes(searchLower) ||
				task.issueNumber.toString().includes(searchLower)
		);
	}

	if (from) {
		const fromTime = new Date(from).getTime();
		filteredTasks = filteredTasks.filter((task) => {
			const taskTime = task.completedAt ? new Date(task.completedAt).getTime() : 0;
			return taskTime >= fromTime;
		});
	}

	if (to) {
		const toTime = new Date(to).getTime();
		filteredTasks = filteredTasks.filter((task) => {
			const taskTime = task.completedAt ? new Date(task.completedAt).getTime() : 0;
			return taskTime <= toTime;
		});
	}

	// Sort by completion time (most recent first)
	filteredTasks.sort((a, b) => {
		const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
		const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
		return bTime - aTime;
	});

	// Pagination
	const total = filteredTasks.length;
	const paginatedTasks = filteredTasks.slice(offset, offset + limit);

	return json({
		tasks: paginatedTasks,
		total,
		limit,
		offset
	});
};
