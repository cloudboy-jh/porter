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
	import type { AgentConfig } from '$lib/types/agent';

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
	<Dialog.Content class="sm:max-w-4xl max-h-[85vh] flex flex-col">
		<Dialog.Header class="flex-shrink-0">
			<Dialog.Title>Agent Configuration</Dialog.Title>
			<Dialog.Description>
				Enable agents, set priority defaults, and add prompt guidance.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto py-4 -mx-6 px-6">
			<AgentSettings
				bind:agents
				onsave={handleAgentSave}
				onrefresh={handleAgentRefresh}
				framed={false}
			/>
		</div>

		<Dialog.Footer class="flex-shrink-0">
			<Button variant="secondary" onclick={() => handleAgentSave(agents)}>Save Changes</Button>
			<Button variant="outline" onclick={() => (open = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
