<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun, Github } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	let { open = $bindable(false) } = $props();

	// Theme state
	let theme = $state('dark');

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
				return;
			}
		}
		if (typeof window !== 'undefined') {
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
	});

	$effect(() => {
		applyTheme(theme);
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('porter-theme', theme);
		}
	});

	// GitHub connection
	const github = $state({
		connected: true,
		handle: '@jackgolding',
		lastSync: '3m ago'
	});

	// Agent quick toggles
	let agents = $state([
		{ name: 'aider', enabled: true },
		{ name: 'cursor', enabled: true },
		{ name: 'windsurf', enabled: false },
		{ name: 'cline', enabled: false }
	]);

	const toggleAgent = (name: string) => {
		agents = agents.map((agent) =>
			agent.name === name ? { ...agent, enabled: !agent.enabled } : agent
		);
	};

	// Keyboard shortcut handler
	const handleKeydown = (event: KeyboardEvent) => {
		if ((event.metaKey || event.ctrlKey) && event.key === ',') {
			event.preventDefault();
			open = !open;
		}
	};

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Quick Settings</Dialog.Title>
			<Dialog.Description>
				Common settings and quick toggles
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Theme Toggle -->
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Appearance</Label>
					<p class="text-xs text-muted-foreground">
						{theme === 'dark' ? 'Dark mode' : 'Light mode'}
					</p>
				</div>
				<Button variant="outline" size="icon" onclick={toggleTheme}>
					{#if theme === 'dark'}
						<Moon size={16} />
					{:else}
						<Sun size={16} />
					{/if}
				</Button>
			</div>

			<Separator />

			<!-- GitHub Connection -->
			<div class="space-y-3">
				<Label>GitHub Connection</Label>
				<div class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
					<div class="flex items-center gap-2">
						<Github size={16} class="text-muted-foreground" />
						{#if github.connected}
							<div>
								<p class="text-sm font-medium">Connected</p>
								<p class="text-xs text-muted-foreground">{github.handle} • {github.lastSync}</p>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">Not connected</p>
						{/if}
					</div>
					<Button variant="ghost" size="sm">
						{github.connected ? 'Disconnect' : 'Connect'}
					</Button>
				</div>
			</div>

			<Separator />

			<!-- Quick Agent Toggles -->
			<div class="space-y-3">
				<Label>Agents</Label>
				<div class="grid gap-2">
					{#each agents as agent}
						<div class="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
							<span class="text-sm font-mono capitalize">{agent.name}</span>
							<Button
								variant={agent.enabled ? 'secondary' : 'outline'}
								size="sm"
								onclick={() => toggleAgent(agent.name)}
							>
								{agent.enabled ? 'Enabled' : 'Disabled'}
							</Button>
						</div>
					{/each}
				</div>
				<p class="text-xs text-muted-foreground">
					For advanced agent configuration, visit <a href="/settings" class="underline">Settings</a>
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
