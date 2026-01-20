<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { History, LayoutDashboard, Settings, Zap } from '@lucide/svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import NavUser from '$lib/components/NavUser.svelte';
	import QuickSettingsModal from '$lib/components/QuickSettingsModal.svelte';
	import logoMain from '../../logos/porter-logo-main.png';

	let showQuickSettings = $state(false);

	const navItems = [
		{ label: 'Dashboard', href: '/', icon: LayoutDashboard, action: null as (() => void) | null, shortcut: null as string | null },
		{ label: 'History', href: '/history', icon: History, action: null as (() => void) | null, shortcut: null as string | null },
		{ label: 'Quick Settings', href: null as string | null, icon: Zap, action: () => showQuickSettings = true, shortcut: '⌘,' },
		{ label: 'Settings', href: '/settings', icon: Settings, action: null as (() => void) | null, shortcut: null as string | null }
	];

	const agents = [
		{ name: 'opencode', count: 2, domain: 'opencode.ai' },
		{ name: 'claude', count: 1, domain: 'claude.ai' },
		{ name: 'cursor', count: 1, domain: 'cursor.com' },
		{ name: 'windsurf', count: 0, domain: 'windsurf.com' },
		{ name: 'cline', count: 0, domain: 'github.com/cline' },
		{ name: 'aider', count: 0, domain: 'aider.chat' }
	];

	const getAgentIcon = (domain: string) =>
		`https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

	const stats = [
		{ label: 'Today', value: '12' },
		{ label: 'Success', value: '87%' },
		{ label: 'Avg', value: '8m' },
		{ label: 'Uptime', value: '4h' }
	];

	let selectedAgent = $state<{ name: string; count: number; domain: string } | null>(null);

	// Mock task data - replace with actual task data later
	const getAgentTasks = (agentName: string) => {
		return [
			{ id: 1, title: 'Add user auth system', status: 'running', repo: 'porter', issue: '#42' },
			{ id: 2, title: 'Refactor core API layer', status: 'failed', repo: 'core', issue: '#301' }
		].filter(() => Math.random() > 0.5); // Mock filter
	};
</script>

<Sidebar.Root variant="inset" collapsible="icon">
	<Sidebar.Header class="flex h-16 items-center border-b border-sidebar-border px-6">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" class="gap-3" onclick={() => goto('/')}>
					<div class="flex size-8 items-center justify-center rounded-lg">
						<img class="h-5 w-5" src={logoMain} alt="Porter logo" />
					</div>
					<div class="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
						<span class="font-medium">Porter</span>
						<span class="text-xs text-sidebar-foreground/60">Task Orchestrator</span>
					</div>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content class="gap-6 py-4">
		<Sidebar.Group>
			<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								tooltipContent={item.label}
								isActive={item.href ? $page.url.pathname === item.href : false}
								onclick={() => item.action ? item.action() : item.href && goto(item.href)}
							>
								<svelte:component this={item.icon} />
								<span>{item.label}</span>
								{#if item.shortcut}
									<span class="ml-auto text-xs text-sidebar-foreground/60">{item.shortcut}</span>
								{/if}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<Sidebar.Separator />
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			<Sidebar.GroupLabel>Agents</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<div class="grid gap-2">
					{#each agents as agent}
						<button
							class="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 transition hover:bg-sidebar-accent"
							onclick={() => agent.count > 0 ? (selectedAgent = agent) : null}
							disabled={agent.count === 0}
							class:opacity-50={agent.count === 0}
							class:cursor-not-allowed={agent.count === 0}
						>
							<img class="h-7 w-7 rounded-full" src={getAgentIcon(agent.domain)} alt="" />
							<span class="flex-1 capitalize text-sidebar-foreground/80 font-mono text-left">
								{agent.name}
							</span>
							{#if agent.count}
								<span
									class="rounded-full bg-sidebar-accent px-2 py-0.5 text-xs text-sidebar-foreground/70 font-mono"
								>
									{agent.count}
								</span>
							{/if}
						</button>
					{/each}
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<Sidebar.Separator class="group-data-[collapsible=icon]:hidden" />
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			<Sidebar.GroupLabel>Stats</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<div class="grid grid-cols-2 gap-2">
					{#each stats as stat}
						<div class="rounded-md border border-sidebar-border bg-sidebar-accent p-2">
							<div class="text-sm font-semibold text-sidebar-foreground">{stat.value}</div>
							<div class="text-xs text-sidebar-foreground/60">{stat.label}</div>
						</div>
					{/each}
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer class="gap-4 border-t border-sidebar-border px-4 py-4">
		<div class="flex items-center justify-between group-data-[collapsible=icon]:hidden">
			<ThemeToggle />
		</div>
		<NavUser />
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
					<Badge variant="secondary">{selectedAgent.count} task{selectedAgent.count !== 1 ? 's' : ''}</Badge>
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				Active tasks running on this agent
			</Dialog.Description>
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
							<Badge variant={task.status === 'running' ? 'default' : 'destructive'}>
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
