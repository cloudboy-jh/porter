import { json } from '@sveltejs/kit';

import { listTasks } from '$lib/server/store';

export const GET = ({ url }: { url: URL }) => {
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

	// Get all completed tasks (success or failed)
	let tasks = listTasks().filter((task) => task.status === 'success' || task.status === 'failed');

	// Apply filters
	if (status && (status === 'success' || status === 'failed')) {
		tasks = tasks.filter((task) => task.status === status);
	}

	if (agent) {
		tasks = tasks.filter((task) => task.agent === agent);
	}

	if (repo) {
		tasks = tasks.filter(
			(task) => `${task.repoOwner}/${task.repoName}`.toLowerCase().includes(repo.toLowerCase())
		);
	}

	if (branch) {
		tasks = tasks.filter((task) => {
			const taskBranch = (task as any).branch;
			return taskBranch?.toLowerCase() === branch.toLowerCase();
		});
	}

	if (issueNumber) {
		const issueNum = parseInt(issueNumber);
		if (!isNaN(issueNum)) {
			tasks = tasks.filter((task) => task.issueNumber === issueNum);
		}
	}

	if (search) {
		const searchLower = search.toLowerCase();
		tasks = tasks.filter(
			(task) =>
				task.issueTitle.toLowerCase().includes(searchLower) ||
				task.issueNumber.toString().includes(searchLower)
		);
	}

	if (from) {
		const fromTime = new Date(from).getTime();
		tasks = tasks.filter((task) => {
			const taskTime = task.completedAt ? new Date(task.completedAt).getTime() : 0;
			return taskTime >= fromTime;
		});
	}

	if (to) {
		const toTime = new Date(to).getTime();
		tasks = tasks.filter((task) => {
			const taskTime = task.completedAt ? new Date(task.completedAt).getTime() : 0;
			return taskTime <= toTime;
		});
	}

	// Sort by completion time (most recent first)
	tasks.sort((a, b) => {
		const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
		const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
		return bTime - aTime;
	});

	// Pagination
	const total = tasks.length;
	const paginatedTasks = tasks.slice(offset, offset + limit);

	return json({
		tasks: paginatedTasks,
		total,
		limit,
		offset
	});
};
