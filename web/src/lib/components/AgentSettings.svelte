<!--
	AgentSettings - Agent Configuration Form Component
	
	This is a reusable form component for managing agent configuration.
	It displays agent status, enable/disable toggles, and path configuration.
	
	Used in:
	- AgentSettingsModal (Dashboard "Agents" button)
	- /settings page (full settings page)
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import type { AgentConfig } from '$lib/types/agent';
	import { CheckCircle2, AlertCircle, Clock, Target, TrendingUp } from '@lucide/svelte';

	let { 
		agents = $bindable([] as AgentConfig[]),
		onrefresh,
		onsave
	}: {
		agents?: AgentConfig[];
		onrefresh?: () => void;
		onsave?: (config: AgentConfig[]) => void;
	} = $props();

	const getAgentIcon = (domain?: string) =>
		domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

	const toggleAgent = (name: string) => {
		agents = agents.map((agent) =>
			agent.name === name ? { ...agent, enabled: !agent.enabled } : agent
		);
	};

	const updatePath = (name: string, path: string) => {
		agents = agents.map((agent) => (agent.name === name ? { ...agent, path } : agent));
	};

	const handleSave = () => {
		onsave?.(agents);
	};

	const handleRefresh = () => {
		onrefresh?.();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'idle':
				return 'text-emerald-600 bg-emerald-500/15';
			case 'running':
				return 'text-amber-600 bg-amber-500/15';
			case 'error':
				return 'text-destructive bg-destructive/15';
			case 'disabled':
				return 'text-muted-foreground bg-muted';
			default:
				return 'text-muted-foreground bg-muted';
		}
	};
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="text-sm">Agent Configuration</Card.Title>
				<Card.Description>Manage agent binaries and settings</Card.Description>
			</div>
			<Button variant="secondary" size="sm" type="button" onclick={handleRefresh}>
				Refresh
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="space-y-3">
		{#if agents.length === 0}
			<div class="rounded-lg border border-dashed border-border p-8 text-center">
				<p class="text-sm text-muted-foreground">No agents detected</p>
				<Button variant="outline" size="sm" class="mt-3" onclick={handleRefresh}>
					Scan for Agents
				</Button>
			</div>
		{:else}
			<div class="space-y-3">
				{#each agents as agent}
					<div class="rounded-lg border border-border bg-card p-4">
						<!-- Agent Header -->
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-center gap-3">
								{#if agent.domain}
									<img 
										class="h-10 w-10 rounded-lg border border-border" 
										src={getAgentIcon(agent.domain)} 
										alt={agent.name}
									/>
								{/if}
								<div>
									<div class="flex items-center gap-2">
										<h4 class="font-medium capitalize">{agent.name}</h4>
										<Badge variant="outline" class={getStatusColor(agent.status)}>
											{agent.status}
										</Badge>
									</div>
									{#if agent.version}
										<p class="text-xs text-muted-foreground mt-0.5">
											Version {agent.version}
										</p>
									{/if}
								</div>
							</div>
							<Button
								variant={agent.enabled ? 'secondary' : 'default'}
								size="sm"
								type="button"
								onclick={() => toggleAgent(agent.name)}
							>
								{agent.enabled ? 'Disable' : 'Enable'}
							</Button>
						</div>

						<!-- Agent Stats Grid -->
						{#if agent.enabled && (agent.taskCount || agent.successRate || agent.lastUsed)}
							<Separator class="my-3" />
							<div class="grid grid-cols-3 gap-4 text-sm">
								{#if agent.taskCount !== undefined}
									<div class="flex items-center gap-2">
										<Target size={14} class="text-muted-foreground" />
										<div>
											<p class="text-xs text-muted-foreground">Tasks</p>
											<p class="font-medium font-mono">{agent.taskCount}</p>
										</div>
									</div>
								{/if}
								{#if agent.successRate !== undefined}
									<div class="flex items-center gap-2">
										<TrendingUp size={14} class="text-emerald-600" />
										<div>
											<p class="text-xs text-muted-foreground">Success</p>
											<p class="font-medium font-mono text-emerald-600">{agent.successRate}%</p>
										</div>
									</div>
								{/if}
								{#if agent.lastUsed}
									<div class="flex items-center gap-2">
										<Clock size={14} class="text-muted-foreground" />
										<div>
											<p class="text-xs text-muted-foreground">Last Used</p>
											<p class="font-medium">{agent.lastUsed}</p>
										</div>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Agent Path Input -->
						<Separator class="my-3" />
						<div class="space-y-2">
							<label class="text-xs font-medium text-muted-foreground">Binary Path</label>
							<Input
								value={agent.path}
								placeholder="/usr/local/bin/{agent.name}"
								oninput={(event) => updatePath(agent.name, (event.target as HTMLInputElement).value)}
								disabled={!agent.enabled}
							/>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
	<Card.Footer>
		<Button type="button" onclick={handleSave} class="w-full">
			Save Changes
		</Button>
	</Card.Footer>
</Card.Root>
