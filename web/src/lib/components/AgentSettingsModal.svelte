<!--
	AgentSettingsModal - Dialog Wrapper for Agent Configuration
	
	This modal wraps the AgentSettings component in a dialog.
	Opens from the Dashboard "Agents" button for quick agent management.
	
	Purpose: Quick access to agent config without navigating to /settings
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AgentSettings from '$lib/components/AgentSettings.svelte';

	type AgentConfig = {
		name: string;
		enabled: boolean;
		path: string;
		status: string;
	};

	let { 
		open = $bindable(false), 
		agents = $bindable([] as AgentConfig[])
	}: {
		open?: boolean;
		agents?: AgentConfig[];
	} = $props();

	const handleAgentSave = (config: AgentConfig[]) => {
		agents = config;
		// TODO: Save to backend
		console.log('Saving agent config:', config);
	};

	const handleAgentRefresh = () => {
		// TODO: Refresh from backend
		console.log('Refreshing agents');
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Agent Configuration</Dialog.Title>
			<Dialog.Description>
				Enable agents and configure binary paths.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			<AgentSettings 
				bind:agents
				onsave={handleAgentSave}
				onrefresh={handleAgentRefresh}
			/>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
