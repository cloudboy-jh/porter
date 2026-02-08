<script lang="ts">
	import { CaretDown, X } from 'phosphor-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	interface Props {
		icon?: typeof X;
		label: string;
		options: string[];
		selected?: string | null;
		displayValue?: string | null;
		active?: boolean;
		showClear?: boolean;
		searchable?: boolean;
		itemIconType?: 'none' | 'dot' | 'image';
		getItemIcon?: (value: string) => string | null;
		getItemTone?: (value: string) => string;
		onSelect?: (value: string | null) => void;
		onClear?: () => void;
	}

	let {
		icon: Icon,
		label,
		options = [],
		selected = $bindable(null),
		displayValue = null,
		active = false,
		showClear = true,
		searchable = false,
		itemIconType = 'none',
		getItemIcon = () => null,
		getItemTone = () => '',
		onSelect = () => {},
		onClear = () => {}
	}: Props = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');

	const filteredOptions = $derived(
		searchable && searchQuery
			? options.filter((opt) => opt.toLowerCase().includes(searchQuery.toLowerCase()))
			: options
	);

	const displayLabel = $derived(displayValue ?? selected ?? label);

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
		onClear();
	};

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
				class="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted/60 {active ? 'text-primary' : 'text-muted-foreground'}"
			>
				{#if Icon}
					<div class="relative flex h-5 w-5 items-center justify-center">
						<span class="absolute inset-0 rounded-full bg-current opacity-10"></span>
						<Icon size={14} weight="bold" class="relative text-current"></Icon>
					</div>
				{/if}
				<span class="text-xs font-medium">{displayLabel}</span>
				<CaretDown size={12} weight="bold" class="opacity-70"></CaretDown>
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-56 p-2">
		<div class="space-y-2">
			{#if showClear && selected}
				<DropdownMenu.Item
					onclick={handleClear}
					class="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground"
				>
					<span>Clear {label}</span>
					<X size={12} weight="bold" />
				</DropdownMenu.Item>
			{/if}

			{#if searchable}
				<div class="px-2 py-1">
					<Input
						bind:value={searchQuery}
						placeholder="Type to filter..."
						class="h-8 border-border/60 bg-background/80 text-xs"
					/>
				</div>
			{/if}

			{#if (showClear && selected) || searchable}
				<DropdownMenu.Separator class="my-1" />
			{/if}

			{#if filteredOptions.length === 0}
				<div class="px-3 py-4 text-center text-xs text-muted-foreground">No results found</div>
			{:else}
				<div class="max-h-48 overflow-y-auto">
					{#each filteredOptions as option}
						{@const tone = getItemTone(option)}
						{@const iconSrc = getItemIcon(option)}
						<DropdownMenu.Item
							onclick={() => handleSelect(option)}
							class="flex items-center justify-between gap-2 px-3 py-2 text-xs {tone}"
						>
							<span class="flex items-center gap-2 truncate">
								{#if itemIconType === 'dot'}
									<span class="h-2 w-2 rounded-full bg-current {tone || 'text-muted-foreground'}"></span>
								{:else if itemIconType === 'image' && iconSrc}
									<img src={iconSrc} alt="" class="h-4 w-4 rounded-sm" />
								{/if}
								<span class="truncate">{option}</span>
							</span>
							{#if selected === option}
								<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							{/if}
						</DropdownMenu.Item>
					{/each}
				</div>
			{/if}
		</div>
	</DropdownMenu.Content>
</DropdownMenu.Root>
