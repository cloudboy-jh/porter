<script lang="ts">
	import { goto } from '$app/navigation';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	const close = () => goto('/');
</script>

<header class="flex flex-wrap items-center justify-between gap-4">
	<div class="space-y-1">
		<p class="text-xs text-muted-foreground">Porter › Settings</p>
		<h1 class="text-2xl font-semibold text-foreground">Settings</h1>
		<p class="text-sm text-muted-foreground">Tune execution mode, agents, and connections.</p>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="secondary" type="button" onclick={close}>Back to Dashboard</Button>
	</div>
</header>

<SettingsModal open={true} on:close={close} />
