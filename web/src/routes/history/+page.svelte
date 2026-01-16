<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';

	const historyStats = [
		{ label: 'Completed', value: '128' },
		{ label: 'Success Rate', value: '92%' },
		{ label: 'Avg Time', value: '11m' }
	];

	const filters = ['All', 'Success', 'Failed'];
	const filterMap: Record<string, string> = {
		Success: 'success',
		Failed: 'failed'
	};
	const agentDomains: Record<string, string> = {
		aider: 'aider.chat',
		cursor: 'cursor.com',
		windsurf: 'windsurf.com',
		cline: 'github.com/cline',
		opencode: 'opencode.ai'
	};

	const getAgentIcon = (agent: string) =>
		`https://www.google.com/s2/favicons?domain=${agentDomains[agent] ?? 'github.com'}&sz=64`;

	let activeFilter = 'All';

	let historyTasks = [
		{
			id: 'history-140',
			status: 'success',
			statusLabel: 'DONE',
			title: 'Improve queue retry logic',
			repo: 'porter',
			issue: '#140',
			agent: 'aider',
			completed: '5m ago',
			pr: '#512'
		},
		{
			id: 'history-98',
			status: 'success',
			statusLabel: 'DONE',
			title: 'Refine agent detection hints',
			repo: 'porter',
			issue: '#98',
			agent: 'opencode',
			completed: '32m ago',
			pr: '#489'
		},
		{
			id: 'history-77',
			status: 'failed',
			statusLabel: 'FAIL',
			title: 'Refactor API gateway',
			repo: 'core',
			issue: '#77',
			agent: 'cursor',
			completed: '1h ago',
			pr: '—'
		},
		{
			id: 'history-31',
			status: 'success',
			statusLabel: 'DONE',
			title: 'Update onboarding email copy',
			repo: 'onboard',
			issue: '#31',
			agent: 'windsurf',
			completed: '2h ago',
			pr: '#402'
		}
	];

	$: filteredHistoryTasks =
		activeFilter === 'All'
			? historyTasks
			: historyTasks.filter((task) => task.status === filterMap[activeFilter]);
</script>

<header class="flex flex-wrap items-center justify-between gap-4">
	<div class="space-y-1">
		<p class="text-xs text-muted-foreground">Porter › Task History</p>
		<h1 class="text-2xl font-semibold text-foreground">Task History</h1>
		<p class="text-sm text-muted-foreground">Review finished tasks and outcomes.</p>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<Button variant="secondary" type="button">Export</Button>
		<Button type="button">
			<Plus size={16} />
			New Task
		</Button>
	</div>
</header>

<section class="grid gap-3 sm:grid-cols-3">
	{#each historyStats as stat}
		<Card.Root>
			<Card.Content class="space-y-1 p-4">
				<div class="text-lg font-semibold">{stat.value}</div>
				<div class="text-xs text-muted-foreground">{stat.label}</div>
			</Card.Content>
		</Card.Root>
	{/each}
</section>

<section class="flex flex-wrap gap-2">
	{#each filters as filter}
		<Button
			variant={filter === activeFilter ? 'default' : 'outline'}
			size="sm"
			onclick={() => (activeFilter = filter)}
		>
			{filter}
		</Button>
	{/each}
</section>

<section class="rounded-xl border border-border bg-card">
	<Table.Table>
		<Table.Header>
			<Table.Row>
				<Table.Head>Status</Table.Head>
				<Table.Head>Task</Table.Head>
				<Table.Head>Repository</Table.Head>
				<Table.Head>Agent</Table.Head>
				<Table.Head>Completed</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each filteredHistoryTasks as task}
				<Table.Row>
					<Table.Cell>
						<Badge variant={task.status === 'failed' ? 'destructive' : 'secondary'}>
							{task.statusLabel}
						</Badge>
					</Table.Cell>
					<Table.Cell>
						<div class="font-medium">{task.title}</div>
						<div class="text-xs text-muted-foreground">Issue {task.issue} · PR {task.pr}</div>
					</Table.Cell>
					<Table.Cell class="text-muted-foreground font-mono">{task.repo}</Table.Cell>
					<Table.Cell>
						<Badge variant="outline" class="text-xs capitalize font-mono gap-2">
							<img class="h-3.5 w-3.5" src={getAgentIcon(task.agent)} alt="" />
							{task.agent}
						</Badge>
					</Table.Cell>
					<Table.Cell class="text-xs text-muted-foreground font-mono">{task.completed}</Table.Cell>
					<Table.Cell class="text-right">
						<Button variant="ghost" size="sm">View</Button>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Table>
</section>
