<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Table from '$lib/components/ui/table/index.js';

	const dispatch = createEventDispatcher<{ close: void }>();
	let { open = false } = $props();

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

	let selectedMode = 'local';

	const agentRows = [
		{ name: 'aider', path: '/usr/local/bin/aider', status: 'active', label: 'Detected' },
		{ name: 'opencode', path: '~/.local/bin/opencode', status: 'active', label: 'Detected' },
		{ name: 'cursor', path: 'Not found', status: 'missing', label: 'Missing' },
		{ name: 'cline', path: '/usr/local/bin/cline', status: 'idle', label: 'Idle' }
	];

	let wasOpen = open;

	$effect(() => {
		if (wasOpen && !open) {
			dispatch('close');
		}
		wasOpen = open;
	});
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

			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm">Agent Configuration</Card.Title>
					<Card.Description>Agents auto-detected from your system.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2">
					<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
						<span>Detected binaries and status.</span>
						<Button variant="secondary" size="sm" type="button">Refresh Agents</Button>
					</div>
					<Table.Table>
						<Table.Header>
							<Table.Row>
								<Table.Head>Status</Table.Head>
								<Table.Head>Agent</Table.Head>
								<Table.Head>Path</Table.Head>
								<Table.Head class="text-right">State</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each agentRows as agent}
								<Table.Row>
									<Table.Cell>
										<Badge
											variant={agent.status === 'missing' ? 'destructive' : 'secondary'}
										>
											{agent.status}
										</Badge>
									</Table.Cell>
									<Table.Cell class="capitalize">{agent.name}</Table.Cell>
									<Table.Cell class="text-xs text-muted-foreground">
										{agent.path}
									</Table.Cell>
									<Table.Cell class="text-right text-xs text-muted-foreground">
										{agent.label}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Table>
				</Card.Content>
			</Card.Root>
		</div>

		<Dialog.Footer class="flex flex-wrap gap-2">
			<Button variant="secondary" type="button" onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button type="button">Save Changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
