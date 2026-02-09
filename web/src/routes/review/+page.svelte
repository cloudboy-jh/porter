<script lang="ts">
	import { goto } from '$app/navigation';
	import { CheckSquareOffset } from 'phosphor-svelte';
	import TaskFeed from '$lib/components/TaskFeed.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { mockReviewTasks } from '$lib/test/mocks/tasks';
	import type { Task } from '$lib/types/task';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	type ReviewTask = NonNullable<PageData['reviewableTasks']>[number];

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
		(data.reviewableTasks ?? []).map((task: ReviewTask) => ({
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

	const showMockReviewData = true;
	let feedLayout = $state<'timeline' | 'stacked'>('timeline');

	const tasks = $derived((showMockReviewData ? [...mockReviewTasks, ...liveTasks] : liveTasks));
	const isCompactReviewFeed = $derived(tasks.length >= 1 && tasks.length <= 3);

	const handleReview = (id: string) => {
		if (id.startsWith('mock-review-')) {
			goto('/review/mock');
			return;
		}
		goto(`/review/${encodeURIComponent(id)}`);
	};
</script>

<div class={`w-full max-w-[1200px] mx-auto flex min-h-full justify-center py-4 ${isCompactReviewFeed ? 'items-center' : 'items-start'}`}>
	<TaskFeed
		title="Review"
		headerIcon={CheckSquareOffset}
		emptyTitle="No pull requests ready for review"
		emptyDescription="Completed Porter tasks with PRs will show up here."
		tasks={tasks}
		layout={feedLayout}
		onToggleExpanded={handleReview}
		highlightStatus="success"
		primaryActionLabel="Review"
		showStatusActions={false}
	>
		<div slot="header" class="flex items-center gap-2">
			<Button
				variant={feedLayout === 'timeline' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (feedLayout = 'timeline')}
			>
				Timeline
			</Button>
			<Button
				variant={feedLayout === 'stacked' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (feedLayout = 'stacked')}
			>
				Stacked
			</Button>
		</div>
	</TaskFeed>
</div>
