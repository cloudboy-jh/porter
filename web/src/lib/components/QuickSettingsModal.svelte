<!--
	QuickSettingsModal - Quick Settings Dialog
	
	Lightweight modal for common settings changes.
	Accessible via:
	- Sidebar "Quick Settings" item
	- Keyboard shortcut: ⌘,
	
	Contains: Theme toggle, GitHub status, Agent enable/disable
	For full settings, navigate to /settings page
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { GithubLogo, Moon, Sun } from 'phosphor-svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { AgentConfig } from '$lib/types/agent';

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

	const session = $derived($page.data?.session ?? null);
	const github = $derived({
		connected: Boolean(session),
		handle: session?.user?.login ? `@${session.user.login}` : 'Not connected',
		lastSync: session ? 'Just now' : '—'
	});

	// Agent quick toggles
	const agentDomains: Record<string, string> = {
		opencode: 'opencode.ai',
		claude: 'claude.ai',
		cursor: 'cursor.com',
		windsurf: 'windsurf.com',
		cline: 'github.com/cline',
		aider: 'aider.chat'
	};

	const getAgentIcon = (name: string) =>
		`https://www.google.com/s2/favicons?domain=${agentDomains[name] ?? 'github.com'}&sz=64`;

	let agents = $state<AgentConfig[]>([]);

	const toggleAgent = (name: string) => {
		agents = agents.map((agent) =>
			agent.name === name ? { ...agent, enabled: !agent.enabled } : agent
		);
	};

	const handleGitHubAction = async () => {
		if (github.connected) {
			try {
				await fetch('/api/auth/logout', { method: 'POST' });
			} catch (error) {
				console.error('Disconnect failed:', error);
			}
			await goto('/auth');
			return;
		}
		await goto('/auth');
	};

	const loadAgents = async (force = false) => {
		try {
			const response = await fetch(force ? '/api/agents/scan' : '/api/agents', {
				method: force ? 'POST' : 'GET'
			});
			if (!response.ok) return;
			const data = await response.json();
			agents = data as AgentConfig[];
		} catch (error) {
			console.error('Failed to load agents:', error);
		}
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

	onMount(() => {
		loadAgents(true);
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
							<Moon size={16} weight="bold" />
					{:else}
							<Sun size={16} weight="bold" />
					{/if}
				</Button>
			</div>

			<Separator />

			<!-- GitHub Connection -->
			<div class="space-y-3">
				<Label>GitHub Connection</Label>
				<div class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
					<div class="flex items-center gap-2">
							<GithubLogo size={16} weight="bold" class="text-muted-foreground" />
						{#if github.connected}
							<div>
								<p class="text-sm font-medium">Connected</p>
								<p class="text-xs text-muted-foreground">{github.handle} • {github.lastSync}</p>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">Not connected</p>
						{/if}
					</div>
					<Button variant="ghost" size="sm" onclick={handleGitHubAction}>
						{github.connected ? 'Disconnect' : 'Connect'}
					</Button>
				</div>
			</div>

			<Separator />

			<!-- Quick Agent Toggles -->
			<div class="space-y-3">
				<Label>Agents</Label>
				<div class="grid gap-2">
					{#if agents.length === 0}
						<p class="text-xs text-muted-foreground">No agents available.</p>
					{:else}
						{#each agents as agent}
							<div 
								class="flex items-center justify-between rounded-lg border p-2.5 transition-colors {agent.enabled 
									? 'border-emerald-500/40 bg-emerald-500/10' 
									: 'border-border bg-muted/30'}"
							>
							<div class="flex items-center gap-2.5">
								<img 
									src={getAgentIcon(agent.name)} 
									alt={agent.name}
									class="h-5 w-5 rounded {agent.enabled ? 'opacity-100' : 'opacity-40'}"
								/>
								<span 
									class="h-2 w-2 rounded-full {agent.enabled 
										? 'bg-emerald-500' 
										: 'bg-muted-foreground/40'}"
								></span>
								<span class="text-sm font-mono capitalize {agent.enabled 
									? 'text-foreground' 
									: 'text-muted-foreground'}"
								>
									{agent.name}
								</span>
							</div>
							<Button
								variant={agent.enabled ? 'secondary' : 'outline'}
								size="sm"
								onclick={() => toggleAgent(agent.name)}
								class={agent.enabled 
									? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' 
									: ''}
							>
								{agent.enabled ? 'Enabled' : 'Disabled'}
							</Button>
						</div>
						{/each}
					{/if}
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
