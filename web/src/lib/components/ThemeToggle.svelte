<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';

	const themes = [
		{ value: 'dark', label: 'Dark mode', icon: Moon },
		{ value: 'light', label: 'Light mode', icon: Sun }
	];

	const themeIcons = {
		dark: Moon,
		light: Sun
	};

	let theme = $state('dark');

	const applyTheme = (value: string) => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', value === 'dark');
		}
	};

	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem('porter-theme');
			if (stored === 'light' || stored === 'dark') {
				theme = stored;
				return;
			}
		}

		if (typeof window !== 'undefined') {
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
	});

	$effect(() => {
		applyTheme(theme);
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('porter-theme', theme);
		}
	});
</script>

<div class="theme-toggle">
	<ToggleGroup.Root type="single" variant="outline" size="sm" bind:value={theme}>
		{#each themes as option}
			<ToggleGroup.Item
				value={option.value}
				aria-label={option.label}
				title={option.label}
			>
				<svelte:component this={themeIcons[option.value as keyof typeof themeIcons]} size={16} />
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
</div>
