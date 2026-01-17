<script lang="ts">
	import AgentSettingsModal from '$lib/components/AgentSettingsModal.svelte';
	import CommandBar from '$lib/components/CommandBar.svelte';
	import { ArrowUpRight, GitCommit, Plus, RotateCcw, Square } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';

	let showAgentSettings = $state(false);
	let showDispatch = $state(false);
	let agents = $state<string[]>(['aider', 'cursor', 'windsurf', 'cline']);
	let agentConfig = $state<Array<{ name: string; enabled: boolean; path: string; status: string }>>([]);

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

	const progressStyles: Record<string, string> = {
		running: '[&_[data-slot=progress-indicator]]:bg-amber-500',
		queued: '[&_[data-slot=progress-indicator]]:bg-muted-foreground',
		success: '[&_[data-slot=progress-indicator]]:bg-emerald-500',
		failed: '[&_[data-slot=progress-indicator]]:bg-destructive'
	};

	const agentDomains: Record<string, string> = {
		aider: 'aider.chat',
		cursor: 'cursor.com',
		windsurf: 'windsurf.com',
		cline: 'github.com/cline'
	};

	const getAgentIcon = (agent: string) =>
		`https://www.google.com/s2/favicons?domain=${agentDomains[agent] ?? 'github.com'}&sz=64`;

	let activeFilter = $state('All');

	let tasks = $state([
		{
			id: 'task-42',
			status: 'running',
			statusLabel: 'RUN',
			title: 'Add user auth system',
			repo: 'porter',
			issue: '#42',
			agent: 'aider',
			progress: 65,
			started: '2m ago',
			expanded: true,
			logs: [
				{ time: '14:32:01', level: 'info', message: 'Starting task execution' },
				{ time: '14:32:03', level: 'info', message: 'Analyzing codebase structure' },
				{ time: '14:32:08', level: 'info', message: 'Found 23 relevant files' },
				{ time: '14:32:18', level: 'success', message: 'Created src/auth/provider.ts' },
				{ time: '14:32:22', level: 'success', message: 'Created src/auth/middleware.ts' },
				{ time: '14:32:35', level: 'warning', message: 'Test coverage at 78%' }
			]
		},
		{
			id: 'task-128',
			status: 'queued',
			statusLabel: 'QUE',
			title: 'Fix memory leak',
			repo: 'churn',
			issue: '#128',
			agent: 'cursor',
			progress: 0,
			started: '—',
			expanded: false,
			logs: []
		},
		{
			id: 'task-88',
			status: 'success',
			statusLabel: 'DONE',
			title: 'Tighten onboarding copy',
			repo: 'onboard',
			issue: '#88',
			agent: 'windsurf',
			progress: 100,
			started: '1h ago',
			expanded: false,
			git: { add: 12, remove: 4 },
			logs: []
		},
		{
			id: 'task-301',
			status: 'failed',
			statusLabel: 'FAIL',
			title: 'Refactor core API layer',
			repo: 'core',
			issue: '#301',
			agent: 'aider',
			progress: 45,
			started: '18m ago',
			expanded: false,
			logs: []
		}
	]);

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

<section class="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-lg backdrop-blur">
	<div class="grid grid-cols-[120px_2fr_1fr_1fr_1.2fr_auto] items-center gap-4 border-b border-border/60 pb-3 text-xs font-semibold uppercase text-muted-foreground">
		<span>Status</span>
		<span>Task</span>
		<span>Repository</span>
		<span>Agent</span>
		<span>Progress</span>
		<span class="text-right">Actions</span>
	</div>
	<div class="mt-4 max-h-[80vh] space-y-3 overflow-y-auto pr-1">
		{#each filteredTasks as task}
			<Card.Root
				class="border border-border/60 bg-background/80"
				role="button"
				tabindex={0}
				onclick={() => toggleExpanded(task.id)}
				onkeydown={(event: KeyboardEvent) => handleRowKey(event, task.id)}
			>
				<Card.Content class="grid min-h-[72px] grid-cols-[120px_2fr_1fr_1fr_1.2fr_auto] items-center gap-4 py-3">
					<Badge class={statusStyles[task.status]}>{task.statusLabel}</Badge>
					<div>
						<div class="font-medium">{task.title}</div>
						<div class="text-xs text-muted-foreground">Issue {task.issue}</div>
					</div>
					<div class="text-sm text-muted-foreground font-mono">{task.repo}</div>
					<Badge variant="outline" class="text-xs capitalize font-mono gap-2">
						<img class="h-3.5 w-3.5" src={getAgentIcon(task.agent)} alt="" />
						{task.agent}
					</Badge>
					<div class="flex items-center gap-3">
						<Progress value={task.progress} class={`h-2 ${progressStyles[task.status]}`} />
						<span class="text-xs text-muted-foreground font-mono">{task.progress}%</span>
					</div>
					<div class="flex items-center justify-end gap-2">
						{#if task.status === 'success' && task.git}
							<div class="flex items-center gap-2">
								<span
									class="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 font-mono"
								>
									+{task.git.add}
								</span>
								<span
									class="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-600 font-mono"
								>
									-{task.git.remove}
								</span>
								<span
									class="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground font-mono"
								>
									<GitCommit size={12} />
									commit
								</span>
							</div>
						{:else}
							<Button variant="ghost" size="sm" onclick={(e: MouseEvent) => handleViewClick(e, task.id)}>View</Button>
						{/if}
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
							<Button variant="destructive" size="sm">
								<Square size={14} />
								Stop
							</Button>
							<Button variant="secondary" size="sm">
								<RotateCcw size={14} />
								Restart
							</Button>
							<Button variant="secondary" size="sm">
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

<CommandBar bind:open={showDispatch} {agents} />
<AgentSettingsModal bind:open={showAgentSettings} agents={agentConfig} />
