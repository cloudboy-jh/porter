<script lang="ts">
	import type { Component } from 'svelte';
	import { X } from 'phosphor-svelte';

	interface Props {
		icon?: typeof X;
		label?: string | null;
		title: string;
		description?: string;
		iconClass?: string;
		titleClass?: string;
	}

	let {
		icon: Icon,
		label,
		title,
		description,
		iconClass = 'text-muted-foreground',
		titleClass = ''
	}: Props = $props();
</script>

<div class="flex items-center gap-3">
	{#if Icon}
		<div class="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
			<svelte:component this={Icon} size={18} weight="bold" class={iconClass} />
		</div>
	{/if}
	<div class="space-y-0.5">
		{#if label}
			<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
		{/if}
		<h2 class={`text-base font-semibold text-foreground ${titleClass}`}>{title}</h2>
		{#if description}
			<p class="text-xs text-muted-foreground">{description}</p>
		{/if}
	</div>
</div>
