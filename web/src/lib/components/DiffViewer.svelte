<script lang="ts">
	import { onMount } from 'svelte';
	import { FileDiff, type SupportedLanguages } from '@pierre/diffs';
	import { parseDiffFromFile } from '@pierre/precision-diffs';

	interface Props {
		filename: string;
		before: string | null;
		after: string | null;
		language?: string;
		layout?: 'split' | 'stacked';
		status?: string;
		embedded?: boolean;
	}

	let {
		filename,
		before,
		after,
		language = 'text',
		layout = 'split',
		status = 'modified',
		embedded = false
	}: Props = $props();

	let mount: HTMLDivElement | null = null;
	let diff: FileDiff | null = null;
	let renderError = $state('');
	let themeType = $state<'light' | 'dark'>('light');

	const porterSurfaceUnsafeCSS = `
		[data-diffs-header][data-theme-type='light'],
		[data-diffs][data-theme-type='light'],
		[data-error-wrapper][data-theme-type='light'] {
			--diffs-bg: color-mix(in srgb, var(--card) 96%, var(--background));
			--diffs-bg-context-override: color-mix(in srgb, var(--card) 92%, var(--background));
			--diffs-bg-hover-override: color-mix(in srgb, var(--muted) 18%, var(--card));
			--diffs-bg-buffer-override: color-mix(in srgb, var(--muted) 28%, var(--card));
			--diffs-bg-separator-override: color-mix(in srgb, var(--muted) 30%, var(--card));
		}

		[data-diffs-header][data-theme-type='dark'],
		[data-diffs][data-theme-type='dark'],
		[data-error-wrapper][data-theme-type='dark'] {
			--diffs-bg: color-mix(in srgb, var(--card) 90%, var(--background));
			--diffs-bg-context-override: color-mix(in srgb, var(--card) 86%, var(--background));
			--diffs-bg-hover-override: color-mix(in srgb, var(--muted) 16%, var(--card));
			--diffs-bg-buffer-override: color-mix(in srgb, var(--muted) 22%, var(--card));
			--diffs-bg-separator-override: color-mix(in srgb, var(--muted) 24%, var(--card));
		}

		div[data-diffs-header] {
			border-bottom: 1px solid var(--border) !important;
		}

		div[data-diffs-header] [data-metadata] {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
		}

		div[data-diffs-header] [data-additions-count],
		div[data-diffs-header] [data-deletions-count] {
			display: none !important;
		}
	`;

	const syncThemeType = () => {
		if (typeof document === 'undefined') return;
		themeType = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	};

	const toSupportedLanguage = (value: string): SupportedLanguages => {
		return value as SupportedLanguages;
	};

	const renderDiff = () => {
		if (!diff || !mount) return;
		renderError = '';

		try {
			diff.setOptions({
				theme: { light: 'pierre-light', dark: 'pierre-dark' },
				themeType,
				diffStyle: layout === 'split' ? 'split' : 'unified',
				diffIndicators: 'bars',
				lineDiffType: 'word',
				disableBackground: false,
				disableLineNumbers: false,
				overflow: 'scroll',
				disableFileHeader: false,
				expandUnchanged: false,
				expansionLineCount: 8,
				hunkSeparators: 'metadata',
				unsafeCSS: porterSurfaceUnsafeCSS
			});

			const oldFile: { name: string; contents: string; lang?: SupportedLanguages } | undefined = status === 'added' ? undefined : {
				name: filename,
				contents: before ?? '',
				lang: toSupportedLanguage(language)
			};
			const newFile: { name: string; contents: string; lang?: SupportedLanguages } | undefined = status === 'removed' ? undefined : {
				name: filename,
				contents: after ?? '',
				lang: toSupportedLanguage(language)
			};

			// Compute diff metadata with proper hunks for collapsible sections
			const fileDiff = oldFile && newFile ? parseDiffFromFile(oldFile as any, newFile as any) : undefined;

			diff.render({
				containerWrapper: mount,
				oldFile,
				newFile,
				fileDiff
			});
		} catch (error) {
			renderError = error instanceof Error ? error.message : 'Unable to render diff.';
		}
	};

	onMount(() => {
		if (!mount) return;
		syncThemeType();

		const observer = new MutationObserver(() => {
			syncThemeType();
			renderDiff();
		});
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		diff = new FileDiff({
			theme: { light: 'pierre-light', dark: 'pierre-dark' },
			themeType,
			diffStyle: 'split',
			diffIndicators: 'bars',
			lineDiffType: 'word',
			disableBackground: false,
			expandUnchanged: false,
			expansionLineCount: 8,
			hunkSeparators: 'metadata',
			unsafeCSS: porterSurfaceUnsafeCSS
		});

		renderDiff();

		return () => {
			observer.disconnect();
			diff?.cleanUp();
			diff = null;
		};
	});

	$effect(() => {
		layout;
		before;
		after;
		status;
		language;
		filename;
		themeType;
		renderDiff();
	});
</script>

<div class={embedded ? '' : 'overflow-hidden rounded-lg border border-border/60 bg-card/75'}>
	<div bind:this={mount} class="min-h-[220px]"></div>
	{#if renderError}
		<div class={embedded ? 'mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive' : 'border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive'}>
			{renderError}
		</div>
	{/if}
</div>
