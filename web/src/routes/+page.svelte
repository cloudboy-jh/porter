<script lang="ts">
	import { onMount } from 'svelte';
	import AgentSettingsModal from '$lib/components/AgentSettingsModal.svelte';
	import CommandBar from '$lib/components/CommandBar.svelte';
	import TaskFeed from '$lib/components/TaskFeed.svelte';
	import { Plus } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { AgentConfig, ParsedCommand } from '$lib/types/agent';
	import type { Task } from '$lib/types/task';

	let showAgentSettings = $state(false);
	let showDispatch = $state(false);
	let agentConfig = $state<AgentConfig[]>([]);
	let tasks = $state<Task[]>([]);
	const mockTasks: Task[] = [
		{
			id: 'task-1001',
			status: 'running',
			statusLabel: 'RUN',
			title: 'Upgrade auth middleware',
			technicalSummary: 'Changed auth middleware: JWT signing -> OAuth2 flow',
			repo: 'porter',
			branch: 'main',
			issue: '#412',
			agent: 'opencode',
			progress: 72,
			started: '3m ago',
			expanded: true,
			logs: [
				{ time: '14:32:01', level: 'info', message: 'Starting task execution' },
				{ time: '14:32:10', level: 'info', message: 'Scanning repository structure' },
				{ time: '14:32:24', level: 'warning', message: 'Auth tests failed in staging' }
			],
			git: { add: 18, remove: 6 }
		},
		{
			id: 'task-1002',
			status: 'queued',
			statusLabel: 'QUE',
			title: 'Reduce bundle size',
			technicalSummary: 'Changed build pipeline: full bundle -> split chunks',
			repo: 'atlas',
			branch: 'release',
			issue: '#77',
			agent: 'claude',
			progress: 0,
			started: '-',
			expanded: false,
			logs: [],
			git: { add: 0, remove: 0 }
		},
		{
			id: 'task-1003',
			status: 'success',
			statusLabel: 'DONE',
			title: 'Refresh billing copy',
			technicalSummary: 'Updated billing copy: verbose -> concise',
			repo: 'harvest',
			branch: 'main',
			issue: '#201',
			agent: 'cursor',
			progress: 100,
			started: '48m ago',
			expanded: false,
			prUrl: 'https://github.com/jackgolding/harvest/pull/124',
			prNumber: 124,
			commitHash: 'a3f2c91',
			git: { add: 8, remove: 3 },
			logs: []
		},
		{
			id: 'task-1004',
			status: 'failed',
			statusLabel: 'FAIL',
			title: 'Normalize telemetry payloads',
			technicalSummary: 'Normalized telemetry payloads: mixed keys -> schema',
			repo: 'signal',
			branch: 'develop',
			issue: '#89',
			agent: 'windsurf',
			progress: 38,
			started: '12m ago',
			expanded: false,
			logs: [],
			git: { add: 26, remove: 12 }
		},
		{
			id: 'task-1005',
			status: 'running',
			statusLabel: 'RUN',
			title: 'Add audit trail filters',
			technicalSummary: 'Added filters: date only -> status + date',
			repo: 'ledger',
			branch: 'main',
			issue: '#55',
			agent: 'opencode',
			progress: 44,
			started: '9m ago',
			expanded: false,
			logs: [],
			git: { add: 11, remove: 4 }
		},
		{
			id: 'task-1006',
			status: 'queued',
			statusLabel: 'QUE',
			title: 'Instrument API latency',
			technicalSummary: 'Added latency metrics: none -> p95 tracking',
			repo: 'pulse',
			branch: 'observability',
			issue: '#133',
			agent: 'cline',
			progress: 0,
			started: '-',
			expanded: false,
			logs: [],
			git: { add: 0, remove: 0 }
		},
		{
			id: 'task-1007',
			status: 'success',
			statusLabel: 'DONE',
			title: 'Update onboarding emails',
			technicalSummary: 'Updated onboarding emails: 5-step -> 3-step',
			repo: 'onboard',
			branch: 'main',
			issue: '#19',
			agent: 'claude',
			progress: 100,
			started: '2h ago',
			expanded: false,
			prUrl: 'https://github.com/jackgolding/onboard/pull/88',
			prNumber: 88,
			commitHash: 'c91df08',
			git: { add: 14, remove: 6 },
			logs: []
		},
		{
			id: 'task-1008',
			status: 'failed',
			statusLabel: 'FAIL',
			title: 'Refactor plan limits logic',
			technicalSummary: 'Refactored limits logic: hardcoded -> config-driven',
			repo: 'meter',
			branch: 'main',
			issue: '#247',
			agent: 'windsurf',
			progress: 61,
			started: '28m ago',
			expanded: false,
			logs: [],
			git: { add: 34, remove: 21 }
		},
		{
			id: 'task-1009',
			status: 'running',
			statusLabel: 'RUN',
			title: 'Improve retry backoff',
			technicalSummary: 'Adjusted retry backoff: linear -> exponential',
			repo: 'relay',
			branch: 'main',
			issue: '#308',
			agent: 'cursor',
			progress: 18,
			started: '4m ago',
			expanded: false,
			logs: [],
			git: { add: 6, remove: 2 }
		},
		{
			id: 'task-1010',
			status: 'queued',
			statusLabel: 'QUE',
			title: 'Tighten error boundaries',
			technicalSummary: 'Updated error boundaries: per-page -> per-section',
			repo: 'core',
			branch: 'main',
			issue: '#312',
			agent: 'aider',
			progress: 0,
			started: '-',
			expanded: false,
			logs: [],
			git: { add: 0, remove: 0 }
		}
	];

	const loadAgents = async () => {
		try {
			const response = await fetch('http://localhost:3000/api/agents');
			if (!response.ok) return;
			const data = await response.json();
			agentConfig = data as AgentConfig[];
		} catch {
			// ignore
		}
	};

	const loadTasks = async () => {
		try {
			const response = await fetch('http://localhost:3000/api/tasks');
			if (!response.ok) {
				tasks = mockTasks;
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
				logs: Array<{ level: string; message: string; timestamp: string }>;
			}>;
			if (!data.length) {
				tasks = mockTasks;
				return;
			}
			tasks = data.map((task) => ({
				id: task.id,
				status: task.status as Task['status'],
				statusLabel: getStatusLabel(task.status),
				title: task.issueTitle,
				repo: task.repoName,
				branch: task.branch ?? 'main',
				issue: `#${task.issueNumber}`,
				agent: task.agent,
				progress: task.progress,
				started: getRelativeTime(task.startedAt || task.createdAt),
				expanded: false,
				logs: task.logs.map((log) => ({
					time: new Date(log.timestamp).toLocaleTimeString('en-US', {
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
			tasks = mockTasks;
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
			const response = await fetch('http://localhost:3000/api/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					repoOwner: 'jackgolding',
					repoName: payload.repoName,
					issueNumber: 1,
					issueTitle: payload.prompt,
					issueBody: '',
					agent: payload.agent,
					priority: 3,
					createdBy: 'you'
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
		loadAgents();
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
			const response = await fetch(`http://localhost:3000/api/tasks/${id}/stop`, {
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
			const response = await fetch(`http://localhost:3000/api/tasks/${id}/retry`, {
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

			<section class="px-2">
				<TaskFeed
					tasks={filteredTasks}
					onToggleExpanded={toggleExpanded}
					onStop={handleStop}
					onRestart={handleRestart}
					highlightStatus={highlightStatus}
				/>
			</section>
		</div>
	</div>

<CommandBar bind:open={showDispatch} agents={agentConfig} onsubmit={handleCommandSubmit} />
<AgentSettingsModal bind:open={showAgentSettings} agents={agentConfig} />
