<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Gear, Moon, Sun } from 'phosphor-svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import AgentSettingsDialog from '$lib/components/AgentSettingsDialog.svelte';
	import type { AgentConfig } from '$lib/types/agent';

	let { open = $bindable(false) } = $props();

	let theme = $state('dark');
	let agents = $state<AgentConfig[]>([]);
	let showAgentSettings = $state(false);

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

	const agentDomains: Record<string, string> = {
		opencode: 'opencode.ai',
		'claude-code': 'claude.ai',
		amp: 'ampcode.com'
	};

	const getAgentIcon = (name: string) =>
		`https://www.google.com/s2/favicons?domain=${agentDomains[name] ?? 'github.com'}&sz=64`;

	const hasMissingCredentials = (agent: AgentConfig) => agent.readyState === 'missing_credentials';

	const loadAgents = async (force = false) => {
		try {
			const response = await fetch(force ? '/api/agents/scan' : '/api/agents', {
				method: force ? 'POST' : 'GET'
			});
			if (!response.ok) return;
			agents = (await response.json()) as AgentConfig[];
		} catch (error) {
			console.error('Failed to load agents:', error);
		}
	};

	const saveAgents = async (nextAgents: AgentConfig[]) => {
		try {
			const response = await fetch('/api/agents', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(nextAgents)
			});
			if (!response.ok) throw new Error('Failed to save agents');
			agents = (await response.json()) as AgentConfig[];
		} catch (error) {
			console.error('Failed to save agent toggles:', error);
			await loadAgents(false);
		}
	};

	const toggleAgent = async (name: string) => {
		const nextAgents = agents.map((agent) =>
			agent.name === name ? { ...agent, enabled: !agent.enabled } : agent
		);
		agents = nextAgents;
		await saveAgents(nextAgents);
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if ((event.metaKey || event.ctrlKey) && event.key === ',') {
			event.preventDefault();
			open = !open;
		}
	};

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('porter-theme');
			if (stored === 'light' || stored === 'dark') {
				theme = stored;
			}
		}
		if (typeof window !== 'undefined' && !localStorage.getItem('porter-theme')) {
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}

		window.addEventListener('keydown', handleKeydown);
		loadAgents(true);
		return () => window.removeEventListener('keydown', handleKeydown);
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
					{#if theme === 'dark'}
						<Moon size={16} weight="bold" />
					{:else}
						<Sun size={16} weight="bold" />
					{/if}
				</Button>
			</div>

			<Separator />

			<div class="space-y-2">
				<p class="text-sm font-medium text-foreground">GitHub</p>
				{#if githubConnected}
					<div class="flex items-center gap-2 text-sm text-foreground">
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						<span>Connected as {githubHandle}</span>
					</div>
				{:else}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<span class="h-2 w-2 rounded-full bg-amber-500"></span>
						<span>Not connected</span>
						<Button variant="link" size="sm" class="h-auto px-0 py-0 text-xs" onclick={() => goto('/settings')}>
							Settings
						</Button>
					</div>
				{/if}
			</div>

			<Separator />

			<div class="space-y-2">
				<p class="text-sm font-medium text-foreground">Agents</p>
				{#if agents.length === 0}
					<p class="text-xs text-muted-foreground">No agents available.</p>
				{:else}
					<div class="space-y-2">
						{#each agents as agent}
							<div class="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
								<div class="flex min-w-0 items-center gap-2.5">
									<img src={getAgentIcon(agent.name)} alt={agent.name} class="h-4 w-4 rounded-sm" />
									<button
										type="button"
										class="truncate text-left text-sm font-medium capitalize text-foreground hover:text-primary"
										onclick={() => (showAgentSettings = true)}
									>
										{agent.displayName ?? agent.name}
									</button>
									{#if hasMissingCredentials(agent)}
										<span class="h-1.5 w-1.5 rounded-full bg-amber-500" title="Missing credentials"></span>
									{/if}
									<Button
										variant="ghost"
										size="icon-sm"
										class="h-7 w-7"
										onclick={() => (showAgentSettings = true)}
									>
										<Gear size={14} weight="bold" />
									</Button>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={agent.enabled}
									aria-label={`Toggle ${agent.displayName ?? agent.name}`}
									class={`relative h-6 w-10 rounded-full transition ${agent.enabled ? 'bg-primary/80' : 'bg-muted'}`}
									onclick={() => toggleAgent(agent.name)}
								>
									<span
										class={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${agent.enabled ? 'left-[1.15rem]' : 'left-0.5'}`}
									></span>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<AgentSettingsDialog bind:open={showAgentSettings} bind:agents />
