<script lang="ts">
	export let items: Array<{ label: string; href?: string }> = [];
	export let className = '';
</script>

<nav
	aria-label="Breadcrumb"
	class={`flex flex-wrap items-center gap-1 font-mono text-xs tracking-[0.18em] text-muted-foreground ${className}`}
>
	{#each items as item, index}
		{#if index > 0}
			<span class="text-muted-foreground/60">/</span>
		{/if}
		{#if item.href}
			<a class="transition hover:text-foreground" href={item.href}>{item.label}</a>
		{:else}
			<span class={index === items.length - 1 ? 'text-foreground' : ''}>{item.label}</span>
		{/if}
	{/each}
</nav>
