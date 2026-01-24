<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { CaretUpDown, Gear, GitBranch, SignOut, User } from 'phosphor-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean } = $props();

	const session = $derived($page.data?.session ?? null);
	const user = $derived({
		name: session?.user.name ?? session?.user.login ?? 'GitHub user',
		handle: session?.user.login ? `@${session.user.login}` : 'Not connected',
		avatar: session?.user.avatarUrl ?? ''
	});

	const github = $derived({
		connected: Boolean(session),
		handle: session?.user.login ? `@${session.user.login}` : 'Not connected',
		updated: session ? 'Just now' : '—'
	});

	const handleSignOut = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch (error) {
			console.error('Sign out failed:', error);
		}
		await goto('/auth');
	};

	const handleGitHubAction = async () => {
		if (github.connected) {
			await handleSignOut();
			return;
		}
		await goto('/auth');
	};
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Sidebar.MenuButton
				{...props}
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
							<AvatarFallback>GH</AvatarFallback>
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
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side="top" align="start" class="w-64">
		<DropdownMenu.Label>Account</DropdownMenu.Label>
			<div class="px-2 pb-2">
				<div class="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
					<Avatar class="size-8">
						<AvatarImage src={user.avatar} alt={user.name} />
						<AvatarFallback>GH</AvatarFallback>
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
		<DropdownMenu.Item onclick={handleGitHubAction}>
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
		<DropdownMenu.Item onclick={handleSignOut}>
			<SignOut size={16} weight="bold" />
			Sign out
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
