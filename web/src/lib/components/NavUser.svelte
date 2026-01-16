<script lang="ts">
	import { goto } from '$app/navigation';
	import { ChevronsUpDown, GitBranch, LogOut, Settings, User } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	const user = {
		name: 'Jack Horton',
		handle: '@cloudboy-jh',
		avatar: 'https://github.com/johnhorton.png'
	};

	const github = {
		connected: true,
		handle: '@jackgolding',
		updated: '3m ago'
	};
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Sidebar.MenuButton
				size="lg"
				class="w-full justify-between font-mono"
				tooltipContent={user.name}
			>
				<div class="flex items-center gap-2">
					<Avatar class="size-8">
						<AvatarImage src={user.avatar} alt={user.name} />
						<AvatarFallback>JH</AvatarFallback>
					</Avatar>
					<div class="flex flex-col text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
						<span class="font-medium text-sidebar-foreground">{user.name}</span>
						<span class="text-xs text-sidebar-foreground/60">{user.handle}</span>
					</div>
				</div>
				<ChevronsUpDown class="size-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
			</Sidebar.MenuButton>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" align="start" class="w-64">
		<DropdownMenu.Label>Account</DropdownMenu.Label>
		<div class="px-2 pb-2">
			<div class="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
				<Avatar class="size-8">
					<AvatarImage src={user.avatar} alt={user.name} />
					<AvatarFallback>JH</AvatarFallback>
				</Avatar>
				<div class="text-xs">
					<div class="font-medium text-foreground">{user.name}</div>
					<div class="text-muted-foreground">{user.handle}</div>
				</div>
			</div>
		</div>
		<DropdownMenu.Separator />
		<DropdownMenu.Label>GitHub</DropdownMenu.Label>
		<div class="px-2 pb-2 text-xs text-muted-foreground">
			<div class="flex items-center justify-between">
				<span>{github.connected ? `Connected as ${github.handle}` : 'Not connected'}</span>
				<span>{github.updated}</span>
			</div>
		</div>
		<DropdownMenu.Item>
			<GitBranch class="size-4" />
			{github.connected ? 'Disconnect GitHub' : 'Connect GitHub'}
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => goto('/settings')}>
			<User class="size-4" />
			Account
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => goto('/settings')}>
			<Settings class="size-4" />
			Settings
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item>
			<LogOut class="size-4" />
			Sign out
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
