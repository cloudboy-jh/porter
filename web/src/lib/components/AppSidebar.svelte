<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { CaretDown, ClockCounterClockwise, Gauge, Gear, Lightning } from 'phosphor-svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import NavUser from '$lib/components/NavUser.svelte';
	import QuickSettingsModal from '$lib/components/QuickSettingsModal.svelte';
	import logoMain from '../../logos/porter-logo-main.png';

	let showQuickSettings = $state(false);

	const navItems = [
		{ label: 'Dashboard', href: '/', icon: Gauge, action: null as (() => void) | null, shortcut: null as string | null },
		{ label: 'History', href: '/history', icon: ClockCounterClockwise, action: null as (() => void) | null, shortcut: null as string | null },
		{ label: 'Quick Settings', href: null as string | null, icon: Lightning, action: () => showQuickSettings = true, shortcut: '⌘,' },
		{ label: 'Settings', href: '/settings', icon: Gear, action: null as (() => void) | null, shortcut: null as string | null }
	] as const;

	const agents = [
		{ name: 'opencode', count: 2, domain: 'opencode.ai' },
		{ name: 'claude', count: 1, domain: 'claude.ai' },
		{ name: 'cursor', count: 1, domain: 'cursor.com' },
		{ name: 'windsurf', count: 0, domain: 'windsurf.com' },
		{ name: 'cline', count: 0, domain: 'github.com/cline' },
		{ name: 'aider', count: 0, domain: 'aider.chat' }
	];

	const activeAgents = $derived(agents.filter((agent) => agent.count > 0));
	const collapsedAgents = $derived((activeAgents.length ? activeAgents : agents).slice(0, 2));

	const getAgentIcon = (domain: string) =>
		`https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

	const stats = [
		{ label: 'Runs Today', value: '12', detail: 'Tasks launched' },
		{ label: 'Success Rate', value: '87%', detail: 'Last 7 days' },
		{ label: 'Avg Runtime', value: '8m', detail: 'Median duration' },
		{ label: 'Active Agents', value: '4', detail: 'Online now' }
	];

	let selectedAgent = $state<{ name: string; count: number; domain: string } | null>(null);
	let agentsOpen = $state(true);

	// Mock task data - replace with actual task data later
	const getAgentTasks = (agentName: string) => {
		return [
			{ id: 1, title: 'Add user auth system', status: 'running', repo: 'porter', issue: '#42' },
			{ id: 2, title: 'Refactor core API layer', status: 'failed', repo: 'core', issue: '#301' }
		].filter(() => Math.random() > 0.5); // Mock filter
	};
</script>

<Sidebar.Root variant="inset" collapsible="icon">
<Sidebar.Header class="flex h-16 items-center border-b border-sidebar-border px-6 group-data-[collapsible=icon]:px-3">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
			<Sidebar.MenuButton
				size="lg"
				class="gap-3 group-data-[collapsible=icon]:justify-center"
				onclick={() => goto('/')}
			>
				<div class="flex size-8 items-center justify-center rounded-xl border border-sidebar-border/60 bg-sidebar-accent/60 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9">
					<img class="h-5 w-5" src={logoMain} alt="Porter logo" />
				</div>
				<div class="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
					<span class="text-sm font-semibold tracking-[0.18em] uppercase">Porter</span>
				</div>
			</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content class="gap-6 py-4 pb-32">
		<Sidebar.Group>
		<Sidebar.GroupLabel class="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
			Platform
		</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item}
						<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContent={item.label}
							isActive={item.href ? $page.url.pathname === item.href : false}
							onclick={() => item.action ? item.action() : item.href && goto(item.href)}
							class="rounded-lg border border-transparent transition hover:border-sidebar-border/60 hover:bg-sidebar-accent/70"
						>
							<item.icon size={16} weight="bold" />
							<span>{item.label}</span>
							{#if item.shortcut}
								<span class="ml-auto text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/60">
									{item.shortcut}
								</span>
							{/if}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<Sidebar.Separator />
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			<Sidebar.GroupLabel class="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
				Agents
			</Sidebar.GroupLabel>
			<Sidebar.GroupAction
				onclick={() => (agentsOpen = !agentsOpen)}
				aria-expanded={agentsOpen}
				class={agentsOpen ? '' : '-rotate-90'}
			>
				<CaretDown size={14} weight="bold" />
				<span class="sr-only">Toggle agents</span>
			</Sidebar.GroupAction>
			{#if agentsOpen}
				<Sidebar.GroupContent>
					<div class="grid gap-2">
						{#each agents as agent}
							<button
								class="flex items-center gap-3 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/60 px-2 py-1.5 text-sm transition hover:border-sidebar-border hover:bg-sidebar-accent"
								onclick={() => agent.count > 0 ? (selectedAgent = agent) : null}
								disabled={agent.count === 0}
								class:opacity-50={agent.count === 0}
								class:cursor-not-allowed={agent.count === 0}
							>
								<img class="h-7 w-7 rounded-lg border border-sidebar-border/60" src={getAgentIcon(agent.domain)} alt="" />
								<span class="flex-1 font-mono text-left capitalize text-sidebar-foreground/80">
									{agent.name}
								</span>
								{#if agent.count}
									<span
										class="rounded-full border border-sidebar-border/60 bg-sidebar px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70"
									>
										{agent.count}
									</span>
								{/if}
							</button>
						{/each}
					</div>
				</Sidebar.GroupContent>
			{:else}
				<Sidebar.GroupContent>
					<div class="grid gap-2">
						{#each collapsedAgents as agent}
							<button
								class="flex items-center gap-3 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 px-2 py-1.5 text-sm transition hover:border-sidebar-border hover:bg-sidebar-accent"
								onclick={() => agent.count > 0 ? (selectedAgent = agent) : null}
								disabled={agent.count === 0}
								class:opacity-60={agent.count === 0}
								class:cursor-not-allowed={agent.count === 0}
							>
								<img class="h-7 w-7 rounded-lg border border-sidebar-border/60" src={getAgentIcon(agent.domain)} alt="" />
								<span class="flex-1 font-mono text-left capitalize text-sidebar-foreground/75">
									{agent.name}
								</span>
								{#if agent.count}
									<span
										class="rounded-full border border-sidebar-border/60 bg-sidebar px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/70"
									>
										{agent.count}
									</span>
								{/if}
							</button>
						{/each}
					</div>
				</Sidebar.GroupContent>
			{/if}
		</Sidebar.Group>
		<Sidebar.Separator class="group-data-[collapsible=icon]:hidden" />
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			<Sidebar.GroupLabel class="text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
				Stats
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<div class="grid grid-cols-2 gap-2">
					{#each stats as stat}
						<div class="rounded-lg border border-sidebar-border/60 bg-sidebar-accent/70 p-2">
							<div class="text-sm font-semibold text-sidebar-foreground">{stat.value}</div>
							<div class="text-[0.65rem] uppercase tracking-[0.18em] text-sidebar-foreground/60">
								{stat.label}
							</div>
							<div class="mt-1 text-[0.6rem] text-sidebar-foreground/55">
								{stat.detail}
							</div>
						</div>
					{/each}
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer class="absolute inset-x-0 bottom-0 border-t border-sidebar-border bg-sidebar/95 px-4 py-3 backdrop-blur group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
		<div class="flex items-center justify-center gap-3 group-data-[collapsible=icon]:gap-2">
			<ThemeToggle />
			<div class="h-5 w-px bg-sidebar-border/70 group-data-[collapsible=icon]:hidden"></div>
			<NavUser iconOnly />
		</div>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

<Dialog.Root open={selectedAgent !== null} onOpenChange={(open) => !open && (selectedAgent = null)}>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				{#if selectedAgent}
					<img class="h-6 w-6 rounded-full" src={getAgentIcon(selectedAgent.domain)} alt="" />
					<span class="capitalize">{selectedAgent.name}</span>
					<Badge variant="outline" class="text-[0.65rem] uppercase tracking-[0.18em]">
						{selectedAgent.count} task{selectedAgent.count !== 1 ? 's' : ''}
					</Badge>
				{/if}
			</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-2">
			{#if selectedAgent}
				{#each getAgentTasks(selectedAgent.name) as task}
					<div class="rounded-lg border border-border bg-muted/40 p-3">
						<div class="flex items-start justify-between gap-2">
							<div>
								<p class="font-medium">{task.title}</p>
								<p class="text-xs text-muted-foreground">
									{task.repo} • Issue {task.issue}
								</p>
							</div>
							<Badge
								variant="outline"
								class={
									task.status === 'running'
										? 'border-primary/40 bg-primary/10 text-primary'
										: 'border-destructive/40 bg-destructive/10 text-destructive'
								}
							>
								{task.status}
							</Badge>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<QuickSettingsModal bind:open={showQuickSettings} />
