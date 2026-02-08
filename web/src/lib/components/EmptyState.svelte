<script lang="ts">
	import { X } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	interface Props {
		icon?: typeof X;
		title: string;
		description: string;
		actionLabel?: string;
		actionHref?: string;
		actionOnClick?: () => void;
		variant?: 'default' | 'hero' | 'simple';
	}

	let {
		icon: Icon,
		title,
		description,
		actionLabel,
		actionHref,
		actionOnClick,
		variant = 'default'
	}: Props = $props();
</script>

{#if variant === 'hero'}
	<div class="rounded-2xl border border-border/60 bg-card/70 p-10 text-center">
		{#if Icon}
			<div class="mb-4 flex justify-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
					<Icon size={28} weight="bold" class="text-muted-foreground"></Icon>
				</div>
			</div>
		{/if}
		<h3 class="text-xl font-semibold text-foreground">{title}</h3>
		<p class="mt-2 text-sm text-muted-foreground">{description}</p>
		{#if actionLabel}
			<div class="mt-6 flex justify-center">
				{#if actionHref}
					<Button size="lg" href={actionHref}>{actionLabel}</Button>
				{:else if actionOnClick}
					<Button size="lg" onclick={actionOnClick}>{actionLabel}</Button>
				{/if}
			</div>
		{/if}
	</div>
{:else if variant === 'simple'}
	<div class="rounded-2xl border border-border/60 bg-background/70 p-10 text-center">
		<p class="text-sm font-semibold text-foreground">{title}</p>
		<p class="mt-2 text-xs text-muted-foreground">{description}</p>
		{#if actionLabel}
			<div class="mt-4 flex justify-center gap-2">
				{#if actionHref}
					<Button variant="secondary" size="sm" href={actionHref}>{actionLabel}</Button>
				{:else if actionOnClick}
					<Button variant="secondary" size="sm" onclick={actionOnClick}>{actionLabel}</Button>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<div class="flex flex-col items-center gap-2 py-12 text-center">
		{#if Icon}
			<div class="mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-muted/70">
				<Icon size={20} weight="bold" class="text-muted-foreground"></Icon>
			</div>
		{/if}
		<p class="text-sm font-medium text-foreground">{title}</p>
		<p class="text-xs text-muted-foreground">{description}</p>
		{#if actionLabel}
			<div class="mt-2 flex justify-center gap-2">
				{#if actionHref}
					<Button variant="secondary" size="sm" href={actionHref}>{actionLabel}</Button>
				{:else if actionOnClick}
					<Button variant="secondary" size="sm" onclick={actionOnClick}>{actionLabel}</Button>
				{/if}
			</div>
		{/if}
	</div>
{/if}
