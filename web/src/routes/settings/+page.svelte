<script lang="ts">
	import { Bot, Github, Server } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import AgentSettings from '$lib/components/AgentSettings.svelte';
	import type { AgentConfig } from '$lib/types/agent';

	let selectedMode = $state('cloud');
	let agentConfig = $state<AgentConfig[]>([]);
	let isLoadingAgents = $state(false);

	const enabledAgents = $derived(agentConfig.filter((agent) => agent.enabled).length);
	const totalAgents = $derived(agentConfig.length);

	const loadAgents = async () => {
		isLoadingAgents = true;
		try {
			const response = await fetch('/api/agents');
			if (!response.ok) return;
			const data = await response.json();
			agentConfig = data as AgentConfig[];
		} catch {
			// ignore
		} finally {
			isLoadingAgents = false;
		}
	};

	const executionModes = [
		{
			value: 'cloud',
			label: 'Cloud (Modal containers)',
			note: 'Runs in serverless Modal containers for every task.'
		},
		{
			value: 'priority',
			label: 'Priority cloud (Coming soon)',
			note: 'Reserved capacity for faster task pickup.'
		}
	];

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

<div class="space-y-8">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold text-foreground">Settings</h1>
		<p class="text-sm text-muted-foreground">
			Manage cloud execution, GitHub connection, and agent configuration.
		</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
		<aside class="space-y-4">
			<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
				<Card.Header class="pb-2">
					<Card.Title class="text-sm">Workspace</Card.Title>
					<Card.Description class="text-xs text-muted-foreground">
						Live status for your local environment.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="flex items-center justify-between rounded-lg border border-border/60 bg-background/80 p-3">
						<div class="flex items-center gap-2 text-sm">
						<Server size={14} class="text-muted-foreground" />
						Cloud Execution
					</div>
					<Badge variant="secondary" class="text-xs">Cloud (Modal)</Badge>
					</div>
					<div class="flex items-center justify-between rounded-lg border border-border/60 bg-background/80 p-3">
						<div class="flex items-center gap-2 text-sm">
							<Github size={14} class="text-muted-foreground" />
							GitHub
						</div>
						<Badge variant={github.connected ? 'secondary' : 'outline'} class="text-xs">
							{github.connected ? 'Connected' : 'Disconnected'}
						</Badge>
					</div>
					<div class="flex items-center justify-between rounded-lg border border-border/60 bg-background/80 p-3">
						<div class="flex items-center gap-2 text-sm">
							<Bot size={14} class="text-muted-foreground" />
							Agents
						</div>
						<Badge variant="outline" class="text-xs">
							{enabledAgents}/{totalAgents} enabled
						</Badge>
					</div>
				</Card.Content>
			</Card.Root>
		</aside>

		<div class="space-y-6">
			<section class="space-y-4">
				<div>
					<h2 class="text-lg font-medium">Execution Environment</h2>
					<p class="text-sm text-muted-foreground">Configure how tasks run in the cloud.</p>
				</div>
				<Card.Root>
					<Card.Content class="space-y-4 pt-6">
						<RadioGroup.Root bind:value={selectedMode} class="space-y-3">
							{#each executionModes as mode}
								<label
									class="flex items-start gap-3 rounded-lg border border-border p-4 text-sm transition hover:bg-muted/40 cursor-pointer"
								>
									<RadioGroup.Item value={mode.value} />
									<div class="space-y-1">
										<p class="font-medium text-foreground">{mode.label}</p>
										<p class="text-xs text-muted-foreground">{mode.note}</p>
									</div>
								</label>
							{/each}
						</RadioGroup.Root>
					</Card.Content>
					<Card.Footer>
						<Button>Save Changes</Button>
					</Card.Footer>
				</Card.Root>
			</section>

			<Separator />

			<section class="space-y-4">
				<div>
					<h2 class="text-lg font-medium">GitHub Connection</h2>
					<p class="text-sm text-muted-foreground">
						Manage your GitHub authentication and repository access.
					</p>
				</div>
				<Card.Root>
					<Card.Content class="space-y-4 pt-6">
						<div class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
							<div>
								<p class="text-sm font-medium">Connection Status</p>
								{#if github.connected}
									<p class="text-xs text-muted-foreground">
										Connected as {github.handle} • Last synced {github.lastSync}
									</p>
								{:else}
									<p class="text-xs text-muted-foreground">Not connected</p>
								{/if}
							</div>
							<Badge variant={github.connected ? 'secondary' : 'outline'} class="gap-2">
								<span class={`h-2 w-2 rounded-full ${github.connected ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
								{github.connected ? 'Connected' : 'Disconnected'}
							</Badge>
						</div>
					</Card.Content>
					<Card.Footer class="flex gap-2">
						{#if github.connected}
							<Button variant="destructive">Disconnect GitHub</Button>
							<Button variant="secondary">Refresh Sync</Button>
						{:else}
							<Button>Connect GitHub</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			</section>

			<Separator />

			<section class="space-y-4">
				<div>
					<h2 class="text-lg font-medium">Agent Configuration</h2>
					<p class="text-sm text-muted-foreground">
						Enable agents and configure binary paths.
					</p>
				</div>
				<AgentSettings
					bind:agents={agentConfig}
					onsave={handleAgentSave}
					onrefresh={handleAgentRefresh}
				/>
			</section>
		</div>
	</div>
</div>
