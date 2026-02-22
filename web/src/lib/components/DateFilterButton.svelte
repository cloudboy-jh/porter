<script lang="ts">
	import { CalendarBlank, CaretDown, X } from 'phosphor-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	interface Props {
		label: string;
		toneClass?: string;
		displayValue?: string | null;
		selectedPreset?: string | null;
		dateFrom?: string;
		dateTo?: string;
		onPresetSelect?: (preset: string) => void;
	}

	let {
		label,
		toneClass = 'text-primary',
		displayValue = null,
		selectedPreset = $bindable('any'),
		dateFrom = $bindable(''),
		dateTo = $bindable(''),
		onPresetSelect = () => {}
	}: Props = $props();

	let isOpen = $state(false);

	const displayLabel = $derived(displayValue ?? label);
	const idBase = $derived(label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
	const fromId = $derived(`${idBase || 'date'}-from`);
	const toId = $derived(`${idBase || 'date'}-to`);

	const handlePreset = (preset: string) => {
		selectedPreset = preset;
		onPresetSelect(preset);
	};

	const handleClear = () => {
		selectedPreset = 'any';
		dateFrom = '';
		dateTo = '';
	};

	const handleInput = () => {
		selectedPreset = 'custom';
	};
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
					<CalendarBlank size={14} weight="bold" class="relative text-current" />
				</div>
				<span class="text-xs font-medium">{displayLabel}</span>
				<CaretDown size={12} weight="bold" class="opacity-70" />
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-72 p-3">
		<div class="space-y-3">
			<div class="flex flex-wrap gap-2">
				{#each ['any', 'today', 'last 7d', 'last 30d'] as preset}
					<Button
						variant={selectedPreset === preset ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => handlePreset(preset)}
					>
						{preset}
					</Button>
				{/each}
			</div>
			<div class="grid gap-2">
				<label for={fromId} class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					From
				</label>
				<Input id={fromId} type="date" bind:value={dateFrom} oninput={handleInput} />
			</div>
			<div class="grid gap-2">
				<label for={toId} class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					To
				</label>
				<Input id={toId} type="date" bind:value={dateTo} oninput={handleInput} />
			</div>
			<div class="flex items-center justify-between">
				<Button variant="ghost" size="sm" onclick={handleClear}>
					<X size={12} weight="bold" />
					Clear
				</Button>
				<Button size="sm" onclick={() => (isOpen = false)}>Apply</Button>
			</div>
		</div>
	</DropdownMenu.Content>
</DropdownMenu.Root>
