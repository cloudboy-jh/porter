<script lang="ts">
	import { onMount } from 'svelte';
	import AgentSettingsModal from '$lib/components/AgentSettingsModal.svelte';
	import CommandBar from '$lib/components/CommandBar.svelte';
	import TaskFeed from '$lib/components/TaskFeed.svelte';
	import { GitBranch, Plus, RocketLaunch, Sparkle } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { PageData } from './$types';
	import type { AgentConfig, ParsedCommand } from '$lib/types/agent';
	import type { Task } from '$lib/types/task';

	let showAgentSettings = $state(false);
	let { data } = $props<{ data: PageData }>();
	let showDispatch = $state(false);
	let agentConfig = $state<AgentConfig[]>([]);
	let tasks = $state<Task[]>([]);
	let isLoadingTasks = $state(false);
	let tasksError = $state('');
	const isConnected = $derived(Boolean(data?.session));
	const loadAgents = async (force = false) => {
		try {
			const response = await fetch(force ? '/api/agents/scan' : '/api/agents', {
				method: force ? 'POST' : 'GET'
			});
			if (!response.ok) return;
			const data = await response.json();
			agentConfig = data as AgentConfig[];
		} catch {
			// ignore
		}
	};

	const loadTasks = async () => {
		isLoadingTasks = true;
		tasksError = '';
		try {
			const response = await fetch('/api/tasks');
			if (!response.ok) {
				tasksError = 'Failed to load tasks.';
				tasks = [];
				return;
			}
			const data = await response.json() as Array<{
				id: string;
				status: string;
				repoOwner: string;
				repoName: string;
				branch?: string;
				issueNumber: number;
				issueTitle: string;
				agent: string;
				progress: number;
				createdAt: string;
				startedAt?: string;
				completedAt?: string;
				issueUrl?: string;
				prUrl?: string;
				prNumber?: number;
				logs: Array<{ level: string; message: string; time: string }>;
			}>;
			if (!data.length) {
				tasks = [];
				return;
			}
			tasks = data.map((task) => ({
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
				logs: task.logs.map((log) => ({
					time: new Date(log.time).toLocaleTimeString('en-US', {
						hour12: false,
						hour: '2-digit',
						minute: '2-digit'
					}),
					level: log.level,
					message: log.message
				}))
			}));
		} catch (error) {
			console.error('Failed to load tasks:', error);
			tasksError = 'Failed to load tasks.';
			tasks = [];
		} finally {
			isLoadingTasks = false;
		}
	};

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

	const handleCommandSubmit = async (payload: ParsedCommand) => {
		try {
			const response = await fetch('/api/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					repoOwner: payload.repoOwner,
					repoName: payload.repoName,
					issueNumber: payload.issueNumber,
					prompt: payload.prompt,
					agent: payload.agent,
					priority: payload.priority
				})
			});
			if (!response.ok) throw new Error('Failed to create task');
			await loadTasks();
		} catch (error) {
			console.error('Failed to dispatch task:', error);
		}
	};

	const handleTaskUpdate = (event: CustomEvent) => {
		const data = event.detail as { id?: string; status?: string; progress?: number };
		if (!data.id) return;
		tasks = tasks.map((task) => {
			if (task.id !== data.id) return task;
			return {
				...task,
				status: data.status as Task['status'] || task.status,
				statusLabel: data.status ? getStatusLabel(data.status) : task.statusLabel,
				progress: data.progress ?? task.progress
			};
		});
	};

	const handleTaskLog = (event: CustomEvent) => {
		const data = event.detail as { taskId?: string; level?: string; message?: string; timestamp?: string };
		if (!data.taskId) return;
		tasks = tasks.map((task) => {
			if (task.id !== data.taskId) return task;
			if (!data.timestamp) return task;
			return {
				...task,
				logs: [
					...task.logs,
					{
						time: new Date(data.timestamp).toLocaleTimeString('en-US', {
							hour12: false,
							hour: '2-digit',
							minute: '2-digit'
						}),
						level: data.level || 'info',
						message: data.message || ''
					}
				]
			};
		});
	};

	onMount(() => {
		loadAgents(true);
		loadTasks();

		window.addEventListener('task-update', handleTaskUpdate as EventListener);
		window.addEventListener('task-log', handleTaskLog as EventListener);

		return () => {
			window.removeEventListener('task-update', handleTaskUpdate as EventListener);
			window.removeEventListener('task-log', handleTaskLog as EventListener);
		};
	});

	const filterMap: Record<string, Task['status']> = {
		Running: 'running',
		Queued: 'queued',
		Completed: 'success',
		Failed: 'failed'
	};

	const statusStyles: Record<string, string> = {
		running: 'text-primary',
		queued: 'text-muted-foreground',
		success: 'text-emerald-600',
		failed: 'text-destructive'
	};

	const filterBaseClass =
		'gap-2 rounded-md border border-transparent px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition';

	let activeFilter = $state('All');

	const toggleExpanded = (id: string) => {
		tasks = tasks.map((task) =>
			task.id === id ? { ...task, expanded: !task.expanded } : task
		);
	};

	const handleStop = async (id: string) => {
		try {
			const response = await fetch(`/api/tasks/${encodeURIComponent(id)}/stop`, {
				method: 'PUT'
			});
			if (!response.ok) throw new Error('Failed to stop task');
			await loadTasks();
		} catch (error) {
			console.error('Failed to stop task:', error);
		}
	};

	const handleRestart = async (id: string) => {
		try {
			const response = await fetch(`/api/tasks/${encodeURIComponent(id)}/retry`, {
				method: 'PUT'
			});
			if (!response.ok) throw new Error('Failed to restart task');
			await loadTasks();
		} catch (error) {
			console.error('Failed to restart task:', error);
		}
	};

	const statusCounts = $derived(tasks.reduce<Record<string, number>>((acc, task) => {
		acc[task.status] = (acc[task.status] ?? 0) + 1;
		return acc;
	}, {}));

	const statusPills = $derived([
		{ key: 'running', label: 'Running', count: statusCounts.running ?? 0 },
		{ key: 'queued', label: 'Queued', count: statusCounts.queued ?? 0 },
		{ key: 'success', label: 'Completed', count: statusCounts.success ?? 0 },
		{ key: 'failed', label: 'Failed', count: statusCounts.failed ?? 0 }
	]);

	const filteredTasks = $derived(
		activeFilter === 'All'
			? tasks
			: tasks.filter((task) => task.status === filterMap[activeFilter])
	);

	const highlightStatus = $derived(activeFilter === 'All' ? null : filterMap[activeFilter]);
</script>

	<div class="flex min-h-full items-center justify-center py-6">
		<div class="w-full max-w-6xl space-y-5">
			{#if !isConnected}
				<div class="rounded-2xl border border-border/60 bg-card/70 p-10 text-center">
					<p class="text-sm font-semibold text-foreground">Connect GitHub to see live tasks</p>
					<p class="mt-2 text-xs text-muted-foreground">
						Authorize Porter to start dispatching tasks and opening PRs.
					</p>
					<div class="mt-4 flex justify-center">
						<Button size="lg" href="/api/auth/github">Connect GitHub</Button>
					</div>
				</div>
			{:else}
				<section class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/40 p-1">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => (activeFilter = 'All')}
							class={`${filterBaseClass} ${activeFilter === 'All' ? 'border-border/70 bg-background text-foreground shadow-[0_1px_2px_rgba(20,19,18,0.08)]' : 'text-muted-foreground hover:border-border/50 hover:bg-background/70 hover:text-foreground'}`}
						>
							<span>{tasks.length}</span>
							<span>All</span>
						</Button>
						{#each statusPills as pill}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (activeFilter = pill.label === 'Completed' ? 'Completed' : pill.label)}
								class={`${filterBaseClass} ${statusStyles[pill.key]} ${activeFilter === (pill.label === 'Completed' ? 'Completed' : pill.label) ? 'border-border/70 bg-background text-foreground shadow-[0_1px_2px_rgba(20,19,18,0.08)]' : 'hover:border-border/50 hover:bg-background/70 hover:text-foreground'}`}
							>
								<span class="h-2 w-2 rounded-full bg-current/80"></span>
								<span>{pill.count}</span>
								<span>{pill.label}</span>
							</Button>
						{/each}
					</div>
					<div class="flex flex-wrap gap-2">
						<Button variant="secondary" type="button" onclick={() => (showAgentSettings = true)}>
							Agents
						</Button>
						<Button type="button" onclick={() => (showDispatch = true)}>
							<Plus size={16} weight="bold" />
							Dispatch
							<span class="text-xs opacity-70">⌘K</span>
						</Button>
					</div>
				</section>

				{#if isLoadingTasks}
					<div class="rounded-2xl border border-border/60 bg-card/70 p-10 text-center text-sm text-muted-foreground">
						Loading tasks...
					</div>
				{:else if tasks.length === 0}
					<Card.Root class="relative overflow-hidden border border-border/60 bg-card/70 shadow-[0_20px_45px_-30px_rgba(8,8,8,0.65)]">
						<div class="pointer-events-none absolute inset-0">
							<div class="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"></div>
							<div class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.12),transparent_55%)]"></div>
						</div>
						<Card.Content class="relative mx-auto flex max-w-2xl flex-col items-center gap-6 p-10 text-center">
							<div class="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
								<span class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
									<Sparkle size={14} weight="bold" />
									First run
								</span>
								<span class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-muted-foreground">
									<RocketLaunch size={12} weight="bold" />
									Cloud native
								</span>
							</div>
							<div class="space-y-2">
								<h2 class="text-2xl font-semibold text-foreground">Dispatch Your First Porter Task</h2>
								<p class="text-sm text-muted-foreground">Pick a repo and issue, then Porter ships a PR.</p>
							</div>
							<div class="grid gap-4 text-left text-sm text-muted-foreground sm:grid-cols-3">
								<div class="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_6px_18px_-16px_rgba(15,15,15,0.6)]">
									<span class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-primary">
										<GitBranch size={16} weight="bold" />
									</span>
									<div>
										<p class="text-sm font-semibold text-foreground">Repo + issue linked</p>
										<p class="text-xs text-muted-foreground">Porter pulls context + permissions.</p>
									</div>
								</div>
								<div class="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_6px_18px_-16px_rgba(15,15,15,0.6)]">
									<span class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-primary">
										<RocketLaunch size={16} weight="bold" />
									</span>
									<div>
										<p class="text-sm font-semibold text-foreground">Agent executes in cloud</p>
										<p class="text-xs text-muted-foreground">Live logs stream into the timeline.</p>
									</div>
								</div>
								<div class="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-4 shadow-[0_6px_18px_-16px_rgba(15,15,15,0.6)]">
									<span class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-primary">
										<Sparkle size={16} weight="bold" />
									</span>
									<div>
										<p class="text-sm font-semibold text-foreground">PR ready to review</p>
										<p class="text-xs text-muted-foreground">Review, merge, and track results.</p>
									</div>
								</div>
							</div>
							{#if tasksError}
								<div class="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-destructive">
									{tasksError}
								</div>
							{/if}
							<div class="flex flex-wrap items-center justify-center gap-3">
								<Button size="lg" class="gap-2" onclick={() => (showDispatch = true)}>
									Run first task
									<span class="text-xs opacity-70">⌘K</span>
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<section class="px-2">
						<TaskFeed
							tasks={filteredTasks}
							onToggleExpanded={toggleExpanded}
							onStop={handleStop}
							onRestart={handleRestart}
							highlightStatus={highlightStatus}
						/>
					</section>
				{/if}
			{/if}
		</div>
	</div>

<CommandBar bind:open={showDispatch} agents={agentConfig} onsubmit={handleCommandSubmit} />
<AgentSettingsModal bind:open={showAgentSettings} agents={agentConfig} />
