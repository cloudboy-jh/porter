<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import AgentSettings from '$lib/components/AgentSettings.svelte';

	let selectedMode = $state('local');
	let agentConfig = $state<Array<{ name: string; enabled: boolean; path: string; status: string }>>([
		{ name: 'aider', enabled: true, path: '/usr/local/bin/aider', status: 'idle' },
		{ name: 'cursor', enabled: true, path: '', status: 'idle' },
		{ name: 'windsurf', enabled: false, path: '', status: 'idle' },
		{ name: 'cline', enabled: false, path: '', status: 'idle' }
	]);

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

	const github = $state({
		connected: true,
		handle: '@jackgolding',
		lastSync: '3m ago'
	});

	const handleAgentSave = (config: Array<{ name: string; enabled: boolean; path: string; status: string }>) => {
		agentConfig = config;
		// TODO: Save to backend
		console.log('Saving agent config:', config);
	};

	const handleAgentRefresh = () => {
		// TODO: Refresh from backend
		console.log('Refreshing agents');
	};
</script>

<div class="space-y-8">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold text-foreground">Settings</h1>
		<p class="text-sm text-muted-foreground">
			Manage execution mode, GitHub connection, and agent configuration.
		</p>
	</header>

	<Separator />

	<!-- Execution Mode Section -->
	<section class="space-y-4">
		<div>
			<h2 class="text-lg font-medium">Execution Mode</h2>
			<p class="text-sm text-muted-foreground">Choose where Porter runs your agents.</p>
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

	<!-- GitHub Connection Section -->
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

	<!-- Agent Configuration Section -->
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
