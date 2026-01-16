<script lang="ts">
	import { ChevronsUpDown, LogOut, Settings, User } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	const user = {
		name: 'Jack Horton',
		handle: '@cloudboy-jh',
		avatar: 'https://github.com/johnhorton.png'
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
	<DropdownMenu.Content side="top" align="start" class="w-56">
		<DropdownMenu.Label>Account</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item>
			<User class="size-4" />
			Profile
		</DropdownMenu.Item>
		<DropdownMenu.Item>
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
