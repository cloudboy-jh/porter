<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Moon, Sun } from 'phosphor-svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	let { open = $bindable(false) } = $props();
	let theme = $state('dark');

	const session = $derived($page.data?.session ?? null);
	const githubConnected = $derived(Boolean(session));
	const githubHandle = $derived(session?.user?.login ? `@${session.user.login}` : '');

	const applyTheme = (value: string) => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', value === 'dark');
		}
	};

	const toggleTheme = () => {
		theme = theme === 'dark' ? 'light' : 'dark';
	};

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('porter-theme');
			if (stored === 'light' || stored === 'dark') {
				theme = stored;
			}
		}
	});

	$effect(() => {
		applyTheme(theme);
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('porter-theme', theme);
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Quick Settings</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-foreground">Appearance</p>
					<p class="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
				</div>
				<Button variant="outline" size="icon" onclick={toggleTheme}>
					{#if theme === 'dark'}<Moon size={16} weight="bold" />{:else}<Sun size={16} weight="bold" />{/if}
				</Button>
			</div>
			<div class="space-y-1">
				<p class="text-sm font-medium text-foreground">GitHub</p>
				{#if githubConnected}
					<p class="text-xs text-muted-foreground">Connected as {githubHandle}</p>
				{:else}
					<Button variant="link" size="sm" class="h-auto px-0 py-0 text-xs" onclick={() => goto('/settings')}>Open settings</Button>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
