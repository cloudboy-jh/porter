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

	const handleAgentSave = async (config: AgentConfig[]) => {
		agents = config;
		try {
			const response = await fetch('/api/agents', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config)
			});
			if (!response.ok) return;
			const data = await response.json();
			agents = data as AgentConfig[];
		} catch (error) {
			console.error('Saving agent config failed:', error);
		}
	};

	const handleAgentRefresh = async () => {
		try {
			const response = await fetch('/api/agents/scan', { method: 'POST' });
			if (!response.ok) return;
			const data = await response.json();
			agents = data as AgentConfig[];
		} catch (error) {
			console.error('Refreshing agents failed:', error);
		}
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-3xl max-h-[85vh] flex flex-col">
		<Dialog.Header class="flex-shrink-0">
			<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
				Agent Controls
			</p>
			<Dialog.Title>Quick Agent Configuration</Dialog.Title>
			<Dialog.Description>
				Toggle agents, set priority, and add prompt guidance.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto py-4">
			<AgentSettings
				bind:agents
				onsave={handleAgentSave}
				onrefresh={handleAgentRefresh}
				framed={false}
				mode="quick"
			/>
		</div>

		<Dialog.Footer class="flex-shrink-0">
			<Button onclick={() => handleAgentSave(agents)}>Save Changes</Button>
			<Button variant="ghost" onclick={() => (open = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
