<script lang="ts">
	import { GithubLogo, Robot, Stack, Server } from 'phosphor-svelte';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
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

	const headerLabelClass =
		'text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground';

	onMount(() => {
		loadAgents();
	});
</script>

<div class="w-full space-y-6">
	<div class="grid w-full gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
		<section class="space-y-4">
			<Card.Root class="h-full">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-start gap-4">
							<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
								<div class="relative h-5 w-5">
									<span class="absolute left-0 top-0 h-3.5 w-3.5 rounded-md bg-foreground/80"></span>
									<span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary"></span>
								</div>
							</div>
							<div class="space-y-1">
								<p class={headerLabelClass}>Primary</p>
								<h2 class="text-lg font-semibold text-foreground">Agent Configuration</h2>
							</div>
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

		<div class="space-y-6">
			<section class="space-y-4">
				<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
					<Card.Header class="pb-3">
						<div class="flex items-start gap-4">
							<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
									<Stack size={18} weight="bold" />
							</div>
							<div class="space-y-1">
								<p class={headerLabelClass}>Workspace</p>
								<h2 class="text-lg font-semibold text-foreground">Workspace Signals</h2>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="grid gap-3 pt-0 sm:grid-cols-3 lg:grid-cols-1">
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 text-sm">
									<Server size={14} weight="bold" class="text-muted-foreground" />
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
									<GithubLogo size={14} weight="bold" class="text-muted-foreground" />
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
									<Robot size={14} weight="bold" class="text-muted-foreground" />
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

			<section class="space-y-4">
				<Card.Root>
					<Card.Header class="pb-3">
						<div class="flex items-start gap-4">
							<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
									<Server size={18} weight="bold" />
							</div>
							<div class="space-y-1">
								<p class={headerLabelClass}>Runtime</p>
								<h2 class="text-lg font-semibold text-foreground">Execution Environment</h2>
							</div>
						</div>
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
								<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
									Timeout
								</p>
								<p class="text-sm font-medium">10 minute cap</p>
							</div>
							<div class="rounded-md border border-border/60 bg-background/70 p-3">
								<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
									Scaling
								</p>
								<p class="text-sm font-medium">Autoscale pool</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</section>

			<section class="space-y-4">
				<Card.Root>
					<Card.Header class="pb-3">
						<div class="flex items-start gap-4">
							<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
									<GithubLogo size={18} weight="bold" />
							</div>
							<div class="space-y-1">
								<p class={headerLabelClass}>Security</p>
								<h2 class="text-lg font-semibold text-foreground">GitHub Connection</h2>
							</div>
						</div>
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
		</div>
	</div>
</div>
