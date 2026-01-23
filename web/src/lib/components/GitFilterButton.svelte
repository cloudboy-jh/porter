<script lang="ts">
	import {
		CaretDown,
		Check,
		X
	} from 'phosphor-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	interface Props {
		icon: typeof X;
		label: string;
		options: string[];
		selected: string | null;
		displayValue?: string | null;
		toneClass?: string;
		itemIconType?: 'none' | 'dot' | 'image';
		getItemIcon?: (value: string) => string | null;
		getItemTone?: (value: string) => string;
		onSelect?: (value: string | null) => void;
	}

	let {
		icon,
		label,
		options = [],
		selected = $bindable(null),
		displayValue = null,
		toneClass = 'border-border/60 bg-muted/40 text-muted-foreground',
		itemIconType = 'none',
		getItemIcon = () => null,
		getItemTone = () => '',
		onSelect = () => {}
	}: Props = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');

	const filteredOptions = $derived(
		searchQuery
			? options.filter((opt) => opt.toLowerCase().includes(searchQuery.toLowerCase()))
			: options
	);

	const getToneClass = (value: string) => getItemTone(value);

	const handleSelect = (value: string) => {
		selected = value === selected ? null : value;
		isOpen = false;
		searchQuery = '';
		onSelect(selected);
	};

	const handleClear = () => {
		selected = null;
		isOpen = false;
		searchQuery = '';
		onSelect(null);
	};

	const displayLabel = $derived(displayValue ?? selected ?? label);

	$effect(() => {
		if (isOpen) searchQuery = '';
	});
</script>

<DropdownMenu.Root bind:open={isOpen}>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				onmousedown={(event) => event.preventDefault()}
				class={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted/60 ${toneClass}`}
			>
				<div class="relative flex h-5 w-5 items-center justify-center">
					<span class="absolute inset-0 rounded-full bg-current opacity-10"></span>
					<svelte:component this={icon} size={14} weight="bold" class="relative text-current" />
				</div>
				<span class="text-xs font-medium">{displayLabel}</span>
				<CaretDown size={12} weight="bold" class="opacity-70" />
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-56 p-2">
		<div class="space-y-2">
			{#if selected}
				<DropdownMenu.Item
					onclick={handleClear}
					class="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground"
				>
					<span>Clear {label}</span>
					<X size={12} weight="bold" />
				</DropdownMenu.Item>
			{/if}

			<div class="px-2 py-1">
				<Input
					bind:value={searchQuery}
					placeholder="Type to filter..."
					class="h-8 border-border/60 bg-background/80 text-xs"
				/>
			</div>

			<DropdownMenu.Separator class="my-1" />

			{#if filteredOptions.length === 0}
				<div class="px-3 py-4 text-center text-xs text-muted-foreground">No results found</div>
			{:else}
				<div class="max-h-48 overflow-y-auto">
					{#each filteredOptions as option}
						{@const tone = getToneClass(option)}
						{@const iconSrc = getItemIcon(option)}
						<DropdownMenu.Item
							onclick={() => handleSelect(option)}
							class={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${tone}`}
						>
							<span class="flex items-center gap-2 truncate">
								{#if itemIconType === 'dot'}
									<span class={`h-2 w-2 rounded-full bg-current ${tone || 'text-muted-foreground'}`}></span>
								{:else if itemIconType === 'image' && iconSrc}
									<img src={iconSrc} alt="" class="h-4 w-4 rounded-sm" />
								{/if}
								<span class="truncate">{option}</span>
							</span>
							{#if selected === option}
								<Check size={12} weight="bold" class="text-primary shrink-0" />
							{/if}
						</DropdownMenu.Item>
					{/each}
				</div>
			{/if}
		</div>
	</DropdownMenu.Content>
</DropdownMenu.Root>
