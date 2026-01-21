<script lang="ts">
	import { Bot, Github, Server } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import AgentSettings from '$lib/components/AgentSettings.svelte';
	import type { AgentConfig } from '$lib/types/agent';

	let agentConfig = $state<AgentConfig[]>([]);

	const enabledAgents = $derived(agentConfig.filter((agent) => agent.enabled).length);
	const totalAgents = $derived(agentConfig.length);

	const loadAgents = async () => {
		try {
			const response = await fetch('/api/agents');
			if (!response.ok) return;
			const data = await response.json();
			agentConfig = data as AgentConfig[];
		} catch {
			// ignore
		}
	};

	const github = $state({
		connected: true,
		handle: '@jackgolding',
		lastSync: '3m ago'
	});

	const handleAgentSave = (config: AgentConfig[]) => {
		agentConfig = config;
		// TODO: Save to backend
		console.log('Saving agent config:', config);
	};

	const handleAgentRefresh = () => {
		loadAgents();
	};

	onMount(() => {
		loadAgents();
	});
</script>

<div class="space-y-6">
	<section class="mx-auto w-full max-w-3xl">
		<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
			<Card.Header class="pb-3">
				<Card.Title class="text-sm">Workspace Signals</Card.Title>
				<Card.Description>
					Cloud runtime health and GitHub App connectivity.
				</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3 pt-0 sm:grid-cols-3">
				<div class="rounded-lg border border-border/60 bg-background/80 p-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2 text-sm">
							<Server size={14} class="text-muted-foreground" />
							Modal runtime
						</div>
						<Badge variant="secondary" class="text-[0.65rem] uppercase tracking-[0.18em]">
							Online
						</Badge>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">Ephemeral containers ready.</p>
				</div>
				<div class="rounded-lg border border-border/60 bg-background/80 p-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2 text-sm">
							<Github size={14} class="text-muted-foreground" />
							GitHub App
						</div>
						<Badge variant={github.connected ? 'secondary' : 'outline'} class="text-xs">
							{github.connected ? 'Connected' : 'Disconnected'}
						</Badge>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">Syncing as {github.handle}.</p>
				</div>
				<div class="rounded-lg border border-border/60 bg-background/80 p-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2 text-sm">
							<Bot size={14} class="text-muted-foreground" />
							Agents
						</div>
						<Badge variant="outline" class="text-xs">
							{enabledAgents}/{totalAgents}
						</Badge>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">Enabled and ready.</p>
				</div>
			</Card.Content>
		</Card.Root>
	</section>

	<div class="mx-auto w-full max-w-3xl space-y-6">
		<section class="space-y-4">
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-sm">Execution Environment</Card.Title>
					<Card.Description>
						Every task runs in isolated Modal containers in the Porter cloud.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4 pt-0">
					<div class="rounded-lg border border-border/60 bg-background/80 p-4">
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1">
								<p class="text-sm font-medium text-foreground">Cloud execution</p>
								<p class="text-xs text-muted-foreground">
									Fresh containers for each task with isolated git context and ephemeral storage.
								</p>
							</div>
							<Badge variant="secondary" class="text-xs">Active</Badge>
						</div>
						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-md border border-border/60 bg-background/70 p-3">
								<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
									Isolation
								</p>
								<p class="text-sm font-medium">Ephemeral containers</p>
							</div>
							<div class="rounded-md border border-border/60 bg-background/70 p-3">
								<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Timeout</p>
								<p class="text-sm font-medium">10 minute cap</p>
							</div>
							<div class="rounded-md border border-border/60 bg-background/70 p-3">
								<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Scaling</p>
								<p class="text-sm font-medium">Autoscale pool</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</section>

		<Separator />

		<section class="space-y-4">
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-sm">GitHub Connection</Card.Title>
					<Card.Description>
						Control authentication, permissions, and sync cadence for the Porter GitHub App.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4 pt-0">
					<div class="rounded-lg border border-border bg-muted/40 p-4">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-sm font-medium">Porter GitHub App</p>
								{#if github.connected}
									<p class="text-xs text-muted-foreground">
										Connected as {github.handle} • Last synced {github.lastSync}
									</p>
								{:else}
									<p class="text-xs text-muted-foreground">Not connected</p>
								{/if}
							</div>
							<Badge variant={github.connected ? 'secondary' : 'outline'} class="gap-2">
								<span
									class={`h-2 w-2 rounded-full ${github.connected ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
								></span>
								{github.connected ? 'Connected' : 'Disconnected'}
							</Badge>
						</div>
						<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
							<span class="rounded-full border border-border/60 bg-background/70 px-2 py-1">
								Issues + PRs
							</span>
							<span class="rounded-full border border-border/60 bg-background/70 px-2 py-1">
								Repo contents
							</span>
							<span class="rounded-full border border-border/60 bg-background/70 px-2 py-1">
								Webhook events
							</span>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex flex-wrap gap-2">
					{#if github.connected}
						<Button variant="secondary">Manage App</Button>
						<Button variant="destructive">Disconnect</Button>
					{:else}
						<Button>Connect GitHub</Button>
					{/if}
				</Card.Footer>
			</Card.Root>
		</section>

		<Separator />

		<section class="space-y-4">
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="text-sm">Agent Configuration</Card.Title>
							<Card.Description>
								Enable agents, set priority, and add custom prompt defaults.
							</Card.Description>
						</div>
						<Button variant="ghost" size="sm" type="button" onclick={handleAgentRefresh}>
							Refresh
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="pt-0">
					<AgentSettings
						bind:agents={agentConfig}
						onsave={handleAgentSave}
						onrefresh={handleAgentRefresh}
						framed={false}
					/>
				</Card.Content>
				<Card.Footer class="flex items-center justify-end">
					<Button type="button" onclick={() => handleAgentSave(agentConfig)}>
						Save Changes
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>
	</div>
</div>
