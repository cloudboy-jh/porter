<script lang="ts">
	import { X } from 'phosphor-svelte';
	import * as Card from '$lib/components/ui/card/index.js';

	interface Props {
		icon?: typeof X;
		label: string;
		title: string;
		description?: string;
		iconClass?: string;
		action?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
		class?: string;
		contentClass?: string;
	}

	let {
		icon: Icon,
		label,
		title,
		description,
		iconClass = 'text-muted-foreground',
		action,
		children,
		class: className = '',
		contentClass = ''
	}: Props = $props();
</script>

<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur {className}">
	<Card.Header class="pb-3">
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-start gap-4">
				{#if Icon}
					<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
						<Icon size={18} weight="bold" class={iconClass}></Icon>
					</div>
				{/if}
				<div class="space-y-1">
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
						{label}
					</p>
					<h2 class="text-lg font-semibold text-foreground">{title}</h2>
					{#if description}
						<p class="text-xs text-muted-foreground">{description}</p>
					{/if}
				</div>
			</div>
			{#if action}
				<div class="flex items-center gap-2">
					{@render action()}
				</div>
			{/if}
		</div>
	</Card.Header>
	{#if children}
		<Card.Content class={contentClass}>
			{@render children()}
		</Card.Content>
	{/if}
</Card.Root>
