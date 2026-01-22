<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	let theme = $state('dark');

	const applyTheme = (value: string) => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', value === 'dark');
		}
	};

	const toggleTheme = () => {
		theme = theme === 'dark' ? 'light' : 'dark';
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

<Button variant="ghost" size="icon" onclick={toggleTheme} aria-label="Toggle theme">
	{#if theme === 'dark'}
		<Moon size={16} weight="bold" />
	{:else}
		<Sun size={16} weight="bold" />
	{/if}
</Button>
