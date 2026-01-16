<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	const dispatch = createEventDispatcher<{ refresh: void; save: { config: AgentConfig[] } }>();

	let { agents = [] as AgentConfig[] } = $props();

	type AgentConfig = {
		name: string;
		enabled: boolean;
		path: string;
		status: string;
	};

	const toggleAgent = (name: string) => {
		agents = agents.map((agent) =>
			agent.name === name ? { ...agent, enabled: !agent.enabled } : agent
		);
	};

	const updatePath = (name: string, path: string) => {
		agents = agents.map((agent) => (agent.name === name ? { ...agent, path } : agent));
	};

	const handleSave = () => {
		dispatch('save', { config: agents });
	};
</script>

<Card.Root>
	<Card.Header class="pb-2">
		<Card.Title class="text-sm">Agent Configuration</Card.Title>
		<Card.Description>Enable agents and override binary paths.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
			<span>Detected agents from your machine.</span>
			<Button variant="secondary" size="sm" type="button" onclick={() => dispatch('refresh')}>
				Refresh Agents
			</Button>
		</div>
		<div class="space-y-3">
			{#each agents as agent}
				<div class="rounded-md border border-border/60 bg-muted/30 p-3">
					<div class="flex items-center justify-between gap-4">
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<Badge variant={agent.status === 'error' ? 'destructive' : 'secondary'}>
									{agent.status}
								</Badge>
								<span class="text-sm font-medium capitalize">{agent.name}</span>
							</div>
							<p class="text-xs text-muted-foreground">{agent.enabled ? 'Enabled' : 'Disabled'}</p>
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
					<div class="mt-3">
						<Input
							value={agent.path}
							placeholder="/usr/local/bin/agent"
							oninput={(event) => updatePath(agent.name, (event.target as HTMLInputElement).value)}
						/>
					</div>
				</div>
			{/each}
		</div>
		<div class="flex justify-end">
			<Button type="button" onclick={handleSave}>Save agent settings</Button>
		</div>
	</Card.Content>
</Card.Root>
