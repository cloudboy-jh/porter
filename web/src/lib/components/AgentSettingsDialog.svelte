<!--
	AgentSettingsDialog - Dialog Wrapper for Agent Configuration
	
	This dialog wraps the AgentSettings component in a dialog.
	Opens from the Dashboard "Agents" button for quick agent management.
	
	Purpose: Quick access to agent config without navigating to /settings
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { SlidersHorizontal } from 'phosphor-svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import AgentSettings from '$lib/components/AgentSettings.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
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

	const handleOpenCredentials = async () => {
		open = false;
		await goto('/settings#credentials');
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[88vh] flex-col sm:max-w-3xl">
		<Dialog.Header class="flex-shrink-0 border-b border-border/40 pb-4">
			<PageHeader
				icon={SlidersHorizontal}
				label="Agent Controls"
				title="Agent Configuration"
				description="Toggle agents, set defaults, and tune prompt guidance."
			/>
			<Dialog.Title class="sr-only">Agent Configuration</Dialog.Title>
			<Dialog.Description class="sr-only">Manage agent defaults and status.</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto py-4">
			<AgentSettings
				bind:agents
				onsave={handleAgentSave}
				onrefresh={handleAgentRefresh}
				onopencredentials={handleOpenCredentials}
				framed={false}
				mode="quick"
			/>
		</div>

		<Dialog.Footer class="flex-shrink-0 border-t border-border/40 pt-4">
			<Button variant="ghost" onclick={() => (open = false)}>Close</Button>
			<Button onclick={() => handleAgentSave(agents)}>Save Changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
