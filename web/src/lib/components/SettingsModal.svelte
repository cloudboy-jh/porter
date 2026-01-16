<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import AgentSettings from '$lib/components/AgentSettings.svelte';

	type AgentConfig = {
		name: string;
		enabled: boolean;
		path: string;
		status: string;
	};

	let { 
		open = $bindable(false), 
		agents = [] as AgentConfig[],
		onclose,
		onsave
	}: {
		open?: boolean;
		agents?: AgentConfig[];
		onclose?: () => void;
		onsave?: (agents: AgentConfig[]) => void;
	} = $props();

	const executionModes = [
		{
			value: 'local',
			label: 'Local (Desktop daemon)',
			note: 'Runs on this machine with local agent binaries.'
		},
		{
			value: 'cloud',
			label: 'Cloud (Coming soon)',
			note: 'Background execution with managed containers.'
		}
	];

	let selectedMode = $state('local');

	let wasOpen = $state(open);

	$effect(() => {
		if (wasOpen && !open) {
			onclose?.();
		}
		wasOpen = open;
	});

	const handleAgentSave = (event: CustomEvent<{ config: AgentConfig[] }>) => {
		onsave?.(event.detail.config);
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header class="gap-2">
			<Dialog.Title>Settings</Dialog.Title>
			<Dialog.Description>
				Manage execution, connections, and agent detection.
			</Dialog.Description>
			<Button
				variant="ghost"
				size="icon"
				type="button"
				aria-label="Close settings"
				onclick={() => (open = false)}
			>
				<X size={16} />
			</Button>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm">Execution Mode</Card.Title>
						<Card.Description>
							Choose where Porter runs your agents.
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-2">
						<RadioGroup.Root bind:value={selectedMode} class="space-y-2">
							{#each executionModes as mode}
								<label
									class="flex items-start gap-3 rounded-md border border-border p-3 text-sm transition hover:bg-muted/40"
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
				</Card.Root>

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm">GitHub Connection</Card.Title>
					<Card.Description>Authentication and connection status.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col items-start gap-3">
					<Badge variant="secondary" class="gap-2">
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						Connected as @jackgolding
					</Badge>
					<span class="text-xs text-muted-foreground">Last synced 3m ago</span>
					<Button variant="secondary" type="button">Disconnect</Button>
				</Card.Content>
			</Card.Root>
		</div>

		<AgentSettings
			agents={agents}
			on:refresh
			on:save={handleAgentSave}
		/>
	</div>


		<Dialog.Footer class="flex flex-wrap gap-2">
			<Button variant="secondary" type="button" onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button type="button">Save Changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
