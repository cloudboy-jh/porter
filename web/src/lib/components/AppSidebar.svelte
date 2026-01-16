<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { History, LayoutDashboard, Settings2 } from '@lucide/svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import NavUser from '$lib/components/NavUser.svelte';
	import logoMain from '../../logos/porter-logo-main.png';

	const navItems = [
		{ label: 'Dashboard', href: '/', icon: LayoutDashboard },
		{ label: 'History', href: '/history', icon: History },
		{ label: 'Settings', href: '/settings', icon: Settings2 }
	];

	const agents = [
		{ name: 'aider', count: 2, domain: 'aider.chat' },
		{ name: 'cursor', count: 1, domain: 'cursor.com' },
		{ name: 'windsurf', count: 0, domain: 'windsurf.com' },
		{ name: 'cline', count: 0, domain: 'github.com/cline' }
	];

	const getAgentIcon = (domain: string) =>
		`https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

	const stats = [
		{ label: 'Today', value: '12' },
		{ label: 'Success', value: '87%' },
		{ label: 'Avg', value: '8m' },
		{ label: 'Uptime', value: '4h' }
	];
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
								isActive={$page.url.pathname === item.href}
								onclick={() => goto(item.href)}
							>
								<svelte:component this={item.icon} />
								<span>{item.label}</span>
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
						<div class="flex items-center gap-2 text-sm">
							<img class="h-7 w-7 rounded-full" src={getAgentIcon(agent.domain)} alt="" />
							<span class="flex-1 capitalize text-sidebar-foreground/80 font-mono">
								{agent.name}
							</span>
							{#if agent.count}
								<span
									class="rounded-full bg-sidebar-accent px-2 py-0.5 text-xs text-sidebar-foreground/70 font-mono"
								>
									{agent.count}
								</span>
							{/if}
						</div>
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
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			<Sidebar.GroupLabel>Mode</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<div class="group-data-[collapsible=icon]:hidden">
					<ThemeToggle />
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
