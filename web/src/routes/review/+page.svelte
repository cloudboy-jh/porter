<script lang="ts">
	import { goto } from '$app/navigation';
	import TaskFeed from '$lib/components/TaskFeed.svelte';
	import { mockTasks } from '$lib/mock/tasks';
	import type { Task } from '$lib/types/task';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const getStatusLabel = (status: string): string => {
		const labels: Record<string, string> = {
			queued: 'QUE',
			running: 'RUN',
			success: 'DONE',
			failed: 'FAIL'
		};
		return labels[status] ?? status.toUpperCase().substring(0, 3);
	};

	const getRelativeTime = (timestamp: string): string => {
		const now = Date.now();
		const then = new Date(timestamp).getTime();
		const diff = Math.floor((now - then) / 1000);
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	};

	const liveTasks = $derived(
		(data.reviewableTasks ?? []).map((task) => ({
			id: task.id,
			status: task.status as Task['status'],
			statusLabel: getStatusLabel(task.status),
			title: task.issueTitle,
			repoOwner: task.repoOwner,
			repo: task.repoName,
			branch: task.branch ?? 'main',
			issue: `#${task.issueNumber}`,
			issueUrl: task.issueUrl,
			agent: task.agent,
			progress: task.progress,
			started: getRelativeTime(task.startedAt || task.createdAt),
			expanded: false,
			prUrl: task.prUrl,
			prNumber: task.prNumber,
			git: task.git ?? undefined,
			technicalSummary: task.summary,
			logs: []
		}))
	);

	const mockReviewTasks = $derived(
		mockTasks
			.filter((task) => task.status === 'success' && Boolean(task.prUrl))
			.map((task) => ({
				...task,
				technicalSummary: task.technicalSummary,
				expanded: false
			}))
	);

	const tasks = $derived(liveTasks.length ? liveTasks : mockReviewTasks);

	const handleReview = (id: string) => {
		goto(`/review/${encodeURIComponent(id)}`);
	};
</script>

<div class="flex min-h-full items-start justify-center py-4">
	<TaskFeed
		title="Review"
		tasks={tasks}
		onToggleExpanded={handleReview}
		highlightStatus="success"
		primaryActionLabel="Review"
		showStatusActions={false}
	/>
</div>
