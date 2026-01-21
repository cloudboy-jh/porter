<script lang="ts">
	import { onMount } from 'svelte';
	import AgentSettingsModal from '$lib/components/AgentSettingsModal.svelte';
	import CommandBar from '$lib/components/CommandBar.svelte';
	import { ArrowUpRight, Plus, RotateCcw, Square } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { AgentConfig, ParsedCommand } from '$lib/types/agent';

	let showAgentSettings = $state(false);
	let showDispatch = $state(false);
	let agentConfig = $state<AgentConfig[]>([]);
	let isLoadingAgents = $state(false);

	interface Task {
		id: string;
		status: 'queued' | 'running' | 'success' | 'failed';
		statusLabel: string;
		title: string;
		technicalSummary?: string;
		repo: string;
		issue: string;
		agent: string;
		progress: number;
		started: string;
		expanded: boolean;
		logs: Array<{ time: string; level: string; message: string }>;
		prUrl?: string;
		prNumber?: number;
		commitHash?: string;
		git?: { add: number; remove: number };
	}

	let tasks = $state<Task[]>([]);
	const mockTasks: Task[] = [
		{
			id: 'task-1001',
			status: 'running',
			statusLabel: 'RUN',
			title: 'Upgrade auth middleware',
			technicalSummary: 'Changed auth middleware: JWT signing -> OAuth2 flow',
			repo: 'porter',
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
		isLoadingAgents = true;
		try {
			const response = await fetch('http://localhost:3000/api/agents');
			if (!response.ok) return;
			const data = await response.json();
			agentConfig = data as AgentConfig[];
		} catch {
			// ignore
		} finally {
			isLoadingAgents = false;
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
					repoName: payload.repo,
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

	const filters = ['All', 'Running', 'Queued', 'Completed', 'Failed'];
	const filterMap: Record<string, string> = {
		Running: 'running',
		Queued: 'queued',
		Completed: 'success',
		Failed: 'failed'
	};

	const statusStyles: Record<string, string> = {
		running: 'bg-amber-500/15 text-amber-600 border-transparent',
		queued: 'bg-muted text-muted-foreground border-transparent',
		success: 'bg-emerald-500/15 text-emerald-600 border-transparent',
		failed: 'bg-destructive/15 text-destructive border-transparent'
	};

	const agentDomains: Record<string, string> = {
		opencode: 'opencode.ai',
		claude: 'claude.ai',
	cursor: 'cursor.com',
	windsurf: 'windsurf.com',
	cline: 'github.com/cline',
	aider: 'aider.chat'
};

	const getAgentIcon = (agent: string) =>
		`https://www.google.com/s2/favicons?domain=${agentDomains[agent] ?? 'github.com'}&sz=64`;

	const getIssueNumber = (issue: string) => (issue.startsWith('#') ? issue.slice(1) : issue);

	let activeFilter = $state('All');

	const toggleExpanded = (id: string) => {
		tasks = tasks.map((task) =>
			task.id === id ? { ...task, expanded: !task.expanded } : task
		);
	};

	const handleRowKey = (event: KeyboardEvent, id: string) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleExpanded(id);
		}
	};

	const handleViewClick = (event: MouseEvent, id: string) => {
		event.stopPropagation();
		toggleExpanded(id);
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
</script>

<div class="flex min-h-full items-center justify-center py-8">
	<div class="w-full max-w-6xl space-y-6">

<section class="flex flex-wrap items-center justify-between gap-2">
	<div class="flex flex-wrap gap-2">
		<Button
			variant={activeFilter === 'All' ? 'secondary' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = 'All')}
			class="gap-2"
		>
			<span>{tasks.length}</span>
			<span>All</span>
		</Button>
		{#each statusPills as pill}
			<Button
				variant={activeFilter === (pill.label === 'Completed' ? 'Completed' : pill.label) ? 'secondary' : 'outline'}
				size="sm"
				onclick={() => (activeFilter = pill.label === 'Completed' ? 'Completed' : pill.label)}
				class={`gap-2 ${statusStyles[pill.key]}`}
			>
				<span class="h-2 w-2 rounded-full bg-current"></span>
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
			<Plus size={16} />
			Dispatch
			<span class="text-xs opacity-70">⌘K</span>
		</Button>
	</div>
</section>

<section class="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-lg backdrop-blur">
	<div class="mt-2 max-h-[80vh] space-y-12 overflow-y-auto pr-1 hide-scrollbar">
		{#each filteredTasks as task}
			<Card.Root
				class={`group task-card task-card--${task.status} rounded-2xl border border-border/60 bg-background/80`}
				style={`--task-progress: ${task.progress}%`}
				role="button"
				tabindex={0}
				onclick={() => toggleExpanded(task.id)}
				onkeydown={(event: KeyboardEvent) => handleRowKey(event, task.id)}
			>
				<Card.Content class="space-y-3 p-5">
					<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span class="font-medium text-foreground/80">{task.repo}</span>
						<span class="text-muted-foreground/60">&bull;</span>
						<span class="flex items-center gap-2 capitalize">
							<img class="h-4 w-4 rounded-sm" src={getAgentIcon(task.agent)} alt="" />
							{task.agent}
						</span>
					</div>
					<div class="text-base font-semibold text-foreground">{task.title}</div>
					<div class="text-sm text-muted-foreground">
						{task.technicalSummary ?? 'Summary pending.'}
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<div class="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
							<span class="inline-flex items-center gap-1">
								<span class="h-2 w-2 rounded-sm bg-emerald-500/80"></span>
								+{task.git?.add ?? 0}
							</span>
							<span class="inline-flex items-center gap-1">
								<span class="h-2 w-2 rounded-sm bg-rose-500/80"></span>
								-{task.git?.remove ?? 0}
							</span>
							<span class="text-muted-foreground/60">&bull;</span>
							{#if task.prUrl}
								<a
									class="text-primary hover:text-primary/80"
									href={task.prUrl}
									target="_blank"
									rel="noreferrer"
								>
									PR #{task.prNumber ?? '-'}
								</a>
							{:else}
								<span>PR -</span>
							{/if}
							<span class="text-muted-foreground/60">&bull;</span>
							<span>{task.commitHash ?? 'commit -'}</span>
							<span class="text-muted-foreground/60">&bull;</span>
							<a
								class="text-primary hover:text-primary/80"
								href={`https://github.com/jackgolding/${task.repo}/issues/${getIssueNumber(task.issue)}`}
								target="_blank"
								rel="noreferrer"
							>
								{task.issue}
							</a>
							<span class="text-muted-foreground/60">&bull;</span>
							<span>{task.started}</span>
						</div>
						<div class="task-actions flex items-center gap-2 md:ml-auto">
							<Button
								variant="ghost"
								size="sm"
								onclick={(event: MouseEvent) => handleViewClick(event, task.id)}
							>
								View
							</Button>
							{#if task.status === 'failed'}
								<Button
									variant="ghost"
									size="sm"
									onclick={(event: MouseEvent) => {
										event.stopPropagation();
										handleRestart(task.id);
									}}
								>
									Retry
								</Button>
							{/if}
							{#if task.status === 'running' || task.status === 'queued'}
								<Button
									variant="ghost"
									size="sm"
									onclick={(event: MouseEvent) => {
										event.stopPropagation();
										handleStop(task.id);
									}}
								>
									Cancel
								</Button>
							{/if}
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			{#if task.expanded}
				<Card.Root class="border border-border/60 bg-background/70">
					<Card.Content class="space-y-4 p-4">
						<div class="grid gap-4 md:grid-cols-4">
							<div>
								<p class="text-xs uppercase text-muted-foreground">Issue</p>
								<p class="text-sm font-medium">{task.issue}</p>
							</div>
							<div>
								<p class="text-xs uppercase text-muted-foreground">Repository</p>
								<p class="text-sm font-medium">jackgolding/{task.repo}</p>
							</div>
							<div>
								<p class="text-xs uppercase text-muted-foreground">Agent</p>
								<p class="text-sm font-medium">{task.agent}</p>
							</div>
							<div>
								<p class="text-xs uppercase text-muted-foreground">Started</p>
								<p class="text-sm font-medium">{task.started}</p>
							</div>
						</div>

						<Card.Root>
							<Card.Header class="pb-2">
								<Card.Title class="text-sm">Task Logs</Card.Title>
							</Card.Header>
							<Card.Content class="space-y-2 text-xs">
								{#each task.logs as log}
									<div class="grid grid-cols-[70px_80px_1fr] items-center gap-3 text-muted-foreground font-mono">
										<span>{log.time}</span>
										<span class="font-semibold uppercase text-foreground">{log.level}</span>
										<span>{log.message}</span>
									</div>
								{/each}
							</Card.Content>
						</Card.Root>

						<div class="flex flex-wrap gap-2">
							<Button variant="destructive" size="sm" onclick={() => handleStop(task.id)}>
								<Square size={14} />
								Stop
							</Button>
							<Button variant="secondary" size="sm" onclick={() => handleRestart(task.id)}>
								<RotateCcw size={14} />
								Restart
							</Button>
							<Button
								variant="secondary"
								size="sm"
								onclick={() => {
									window.open(`https://github.com/jackgolding/${task.repo}/issues/${task.issue.slice(1)}`, '_blank');
								}}
							>
								<ArrowUpRight size={14} />
								View in GitHub
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		{/each}
	</div>
</section>
	</div>
</div>

<CommandBar bind:open={showDispatch} agents={agentConfig} onsubmit={handleCommandSubmit} />
<AgentSettingsModal bind:open={showAgentSettings} agents={agentConfig} />
