<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, ArrowRight, Check } from 'phosphor-svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import GitDiffBadge from '$lib/components/GitDiffBadge.svelte';
	import DiffsEmbed from '$lib/components/DiffsEmbed.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	let confirmOpen = $state(false);
	let isMerging = $state(false);
	let mergeError = $state('');
	let mergeSuccess = $state(false);

	const handleMerge = async () => {
		if (isMerging) return;
		isMerging = true;
		mergeError = '';
		try {
			const response = await fetch('/api/review/merge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskId: data.task.id })
			});
			if (!response.ok) {
				const payload = await response.json();
				mergeError = payload?.error ?? 'Merge failed.';
				return;
			}
			mergeSuccess = true;
			confirmOpen = false;
		} catch (error) {
			mergeError = 'Merge failed.';
		} finally {
			isMerging = false;
		}
	};

	const goToPage = (page: number) => {
		goto(`/review/${encodeURIComponent(data.task.id)}?page=${page}`);
	};
</script>

<div class="space-y-6">
	<Card.Root class="border border-border/60 bg-card/70">
		<Card.Content class="space-y-4 p-6">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Review</p>
					<h1 class="mt-2 text-2xl font-semibold text-foreground">{data.task.issueTitle}</h1>
					<p class="mt-2 text-sm text-muted-foreground">
						{data.task.repoOwner}/{data.task.repoName} · #{data.task.issueNumber}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="outline" class="text-[10px] uppercase border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
						Ready
					</Badge>
					<GitDiffBadge variant="add" value={data.pr.additions} />
					<GitDiffBadge variant="remove" value={data.pr.deletions} />
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				<span class="capitalize">{data.task.agent}</span>
				<span class="text-muted-foreground/60">&bull;</span>
				<a class="text-primary hover:text-primary/80" href={data.pr.htmlUrl} target="_blank" rel="noreferrer">
					PR #{data.pr.number}
				</a>
				{#if data.pr.mergeableState}
					<span class="text-muted-foreground/60">&bull;</span>
					<span class="capitalize">{data.pr.mergeableState}</span>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="border border-border/60 bg-card/70">
		<Card.Header class="pb-2">
			<Card.Title class="text-sm">Issue Context</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4 pt-0 text-sm text-muted-foreground">
			<p>{data.task.issueBody || 'No issue description provided.'}</p>
			{#if data.task.summary}
				<div class="rounded-lg border border-border/60 bg-background/70 p-3">
					<p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Agent summary</p>
					<p class="mt-2 text-sm text-foreground/90">{data.task.summary}</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="border border-border/60 bg-card/70">
		<Card.Header class="pb-2">
			<Card.Title class="text-sm">Code Changes</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4 pt-0">
			{#each data.diffUrls as diff}
				<DiffsEmbed filename={diff.filename} beforeUrl={diff.beforeUrl} afterUrl={diff.afterUrl} />
			{/each}
			<div class="flex items-center justify-between">
				<Button variant="secondary" size="sm" disabled={data.page <= 1} onclick={() => goToPage(data.page - 1)}>
					<ArrowLeft size={14} weight="bold" />
					Previous
				</Button>
				<p class="text-xs text-muted-foreground">Page {data.page} of {data.totalPages}</p>
				<Button
					variant="secondary"
					size="sm"
					disabled={data.page >= data.totalPages}
					onclick={() => goToPage(data.page + 1)}
				>
					Next
					<ArrowRight size={14} weight="bold" />
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="border border-border/60 bg-card/70">
		<Card.Content class="flex flex-wrap items-center justify-between gap-3 p-6">
			<Button variant="secondary" href={data.pr.htmlUrl} target="_blank" rel="noreferrer">
				View PR in GitHub
			</Button>
			{#if data.canMerge}
				<Button class="gap-2" onclick={() => (confirmOpen = true)} disabled={mergeSuccess}>
					<Check size={16} weight="bold" />
					{mergeSuccess ? 'Merged' : 'Approve & merge'}
				</Button>
			{:else}
				<Badge variant="outline" class="text-xs">Merge permission required</Badge>
			{/if}
			{#if mergeError}
				<span class="text-xs text-destructive">{mergeError}</span>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<Dialog.Root bind:open={confirmOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Approve and merge?</Dialog.Title>
			<Dialog.Description>
				This will merge the pull request on GitHub. Continue?
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex gap-2">
			<Button variant="secondary" onclick={() => (confirmOpen = false)} disabled={isMerging}>
				Cancel
			</Button>
			<Button class="gap-2" onclick={handleMerge} disabled={isMerging}>
				<Check size={16} weight="bold" />
				{isMerging ? 'Merging...' : 'Confirm merge'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
