<script lang="ts">
	import { onMount } from 'svelte';
	import { FileDiff, type SupportedLanguages } from '@pierre/diffs';

	interface Props {
		filename: string;
		before: string | null;
		after: string | null;
		language?: string;
		layout?: 'split' | 'stacked';
		status?: string;
	}

	let {
		filename,
		before,
		after,
		language = 'text',
		layout = 'split',
		status = 'modified'
	}: Props = $props();

	let mount: HTMLDivElement | null = null;
	let diff: FileDiff | null = null;
	let renderError = $state('');
 	let themeType = $state<'light' | 'dark'>('light');

const porterDiffUnsafeCSS = `
:host {
	--diffs-header-font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	--diffs-font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	--diffs-font-size: 13px;
	--diffs-line-height: 20px;
	--diffs-font-features: 'calt' 1, 'liga' 1;
	--diffs-gap-style: solid;
}

[data-diffs-header],
[data-diffs],
[data-error-wrapper] {
	--diffs-token-light-bg: transparent !important;
	--diffs-token-dark-bg: transparent !important;
	--diffs-fg: var(--foreground);
	--diffs-fg-number-override: color-mix(in srgb, var(--muted-foreground) 70%, var(--foreground));
	--diffs-fg-number-addition-override: color-mix(in srgb, #16a34a 70%, var(--foreground));
	--diffs-fg-number-deletion-override: color-mix(in srgb, var(--destructive) 70%, var(--foreground));
	--diffs-addition-color-override: color-mix(in srgb, #22c55e 80%, var(--foreground));
	--diffs-deletion-color-override: color-mix(in srgb, var(--destructive) 82%, var(--foreground));
	--diffs-modified-color-override: color-mix(in srgb, var(--muted-foreground) 75%, var(--foreground));
	--diffs-gap-style: solid;
}

[data-diffs-header][data-theme-type='light'],
[data-diffs][data-theme-type='light'],
[data-error-wrapper][data-theme-type='light'] {
	--diffs-bg: color-mix(in srgb, var(--card) 96%, var(--background));
	--diffs-light-bg: color-mix(in srgb, var(--card) 96%, var(--background));
	--diffs-dark-bg: color-mix(in srgb, var(--card) 96%, var(--background));
	--diffs-bg-context-override: color-mix(in srgb, var(--card) 93%, var(--background));
	--diffs-bg-hover-override: color-mix(in srgb, var(--muted) 22%, var(--card));
	--diffs-bg-buffer-override: color-mix(in srgb, var(--muted) 30%, var(--card));
	--diffs-bg-separator-override: color-mix(in srgb, var(--muted) 34%, var(--card));
	--diffs-bg-addition-override: color-mix(in srgb, #16a34a 8%, var(--card));
	--diffs-bg-addition-number-override: color-mix(in srgb, #16a34a 12%, var(--card));
	--diffs-bg-addition-hover-override: color-mix(in srgb, #16a34a 14%, var(--card));
	--diffs-bg-addition-emphasis-override: color-mix(in srgb, #16a34a 16%, var(--card));
	--diffs-bg-deletion-override: color-mix(in srgb, var(--destructive) 8%, var(--card));
	--diffs-bg-deletion-number-override: color-mix(in srgb, var(--destructive) 12%, var(--card));
	--diffs-bg-deletion-hover-override: color-mix(in srgb, var(--destructive) 14%, var(--card));
	--diffs-bg-deletion-emphasis-override: color-mix(in srgb, var(--destructive) 16%, var(--card));
}

[data-diffs-header][data-theme-type='dark'],
[data-diffs][data-theme-type='dark'],
[data-error-wrapper][data-theme-type='dark'] {
	--diffs-bg: color-mix(in srgb, var(--card) 90%, var(--background));
	--diffs-light-bg: color-mix(in srgb, var(--card) 90%, var(--background));
	--diffs-dark-bg: color-mix(in srgb, var(--card) 90%, var(--background));
	--diffs-bg-context-override: color-mix(in srgb, var(--card) 87%, var(--background));
	--diffs-bg-hover-override: color-mix(in srgb, var(--muted) 18%, var(--card));
	--diffs-bg-buffer-override: color-mix(in srgb, var(--muted) 24%, var(--card));
	--diffs-bg-separator-override: color-mix(in srgb, var(--muted) 28%, var(--card));
	--diffs-bg-addition-override: color-mix(in srgb, #16a34a 10%, var(--card));
	--diffs-bg-addition-number-override: color-mix(in srgb, #16a34a 14%, var(--card));
	--diffs-bg-addition-hover-override: color-mix(in srgb, #16a34a 17%, var(--card));
	--diffs-bg-addition-emphasis-override: color-mix(in srgb, #16a34a 19%, var(--card));
	--diffs-bg-deletion-override: color-mix(in srgb, var(--destructive) 10%, var(--card));
	--diffs-bg-deletion-number-override: color-mix(in srgb, var(--destructive) 14%, var(--card));
	--diffs-bg-deletion-hover-override: color-mix(in srgb, var(--destructive) 17%, var(--card));
	--diffs-bg-deletion-emphasis-override: color-mix(in srgb, var(--destructive) 19%, var(--card));
}

div[data-diffs-header] {
	background: color-mix(in srgb, var(--muted) 60%, var(--card)) !important;
	border-bottom: 1px solid var(--border) !important;
	color: var(--foreground) !important;
}

[data-buffer],
[data-separator],
[data-separator-wrapper],
[data-separator-content],
[data-no-newline] {
	background-image: none !important;
}

[data-buffer] {
	background: color-mix(in srgb, var(--muted) 42%, var(--card)) !important;
}

[data-column-content],
[data-column-number],
[data-line] {
	color: var(--foreground) !important;
}

[data-column-content] span:not([data-diff-span]) {
	background-color: transparent !important;
}

pre {
	border-color: var(--border) !important;
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
				lineDiffType: 'none',
				disableBackground: true,
				disableLineNumbers: false,
				overflow: 'scroll',
				disableFileHeader: false,
				unsafeCSS: porterDiffUnsafeCSS
			});

			diff.render({
				containerWrapper: mount,
				oldFile:
					status === 'added'
						? undefined
						: {
							name: filename,
							contents: before ?? '',
							lang: toSupportedLanguage(language)
						},
				newFile:
					status === 'removed'
						? undefined
						: {
							name: filename,
							contents: after ?? '',
							lang: toSupportedLanguage(language)
						}
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
			lineDiffType: 'none',
			disableBackground: true,
			unsafeCSS: porterDiffUnsafeCSS
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

<div class="overflow-hidden rounded-lg border border-border/60 bg-card/75">
	<div bind:this={mount} class="min-h-[220px]"></div>
	{#if renderError}
		<div class="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
			{renderError}
		</div>
	{/if}
</div>
