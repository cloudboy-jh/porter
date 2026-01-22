<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		"bg-card text-card-foreground flex flex-col gap-5 rounded-2xl border border-border/70 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.08)]",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
