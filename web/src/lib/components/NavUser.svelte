<script lang="ts">
	import { goto } from '$app/navigation';
	import { CaretUpDown, Gear, GitBranch, SignOut, User } from 'phosphor-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean } = $props();

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
		<Sidebar.MenuButton
			size={compact || iconOnly ? 'sm' : 'lg'}
			class={
				iconOnly
					? 'w-auto justify-center px-2'
					: compact
						? 'w-auto justify-center px-2'
						: 'w-full justify-between font-mono'
			}
			tooltipContent={user.name}
		>
			<div class="flex items-center gap-2">
				{#if iconOnly}
					<User size={16} weight="bold" class="text-sidebar-foreground/70" />
				{:else}
					<Avatar class={compact ? 'size-7' : 'size-8'}>
						<AvatarImage src={user.avatar} alt={user.name} />
						<AvatarFallback>JH</AvatarFallback>
					</Avatar>
				{/if}
				<div
					class={
						compact || iconOnly
							? 'hidden'
							: 'flex flex-col text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'
					}
				>
					<span class="font-medium text-sidebar-foreground">{user.name}</span>
					<span class="text-xs text-sidebar-foreground/60">{user.handle}</span>
				</div>
			</div>
			<CaretUpDown
				size={compact ? 14 : 16}
				weight="bold"
				class={
					iconOnly
						? 'hidden'
						: compact
							? 'text-sidebar-foreground/60'
							: 'text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden'
				}
			/>
		</Sidebar.MenuButton>
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
			<GitBranch size={16} weight="bold" />
			{github.connected ? 'Disconnect GitHub' : 'Connect GitHub'}
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => goto('/account')}>
			<User size={16} weight="bold" />
			Account
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => goto('/settings')}>
			<Gear size={16} weight="bold" />
			Settings
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item>
			<SignOut size={16} weight="bold" />
			Sign out
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
