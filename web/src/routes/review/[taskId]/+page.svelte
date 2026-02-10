<script lang="ts">
	import { Check, GitDiff, NotePencil } from 'phosphor-svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import GitDiffBadge from '$lib/components/GitDiffBadge.svelte';
	import DiffViewer from '$lib/components/DiffViewer.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	let confirmOpen = $state(false);
	let isMerging = $state(false);
	let mergeError = $state('');
	let mergeSuccess = $state(false);
	let diffLayout = $state<'split' | 'stacked'>('split');

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

	const getAnchorId = (filename: string) => `diff-${filename.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

	const scrollToFile = (filename: string) => {
		const id = getAnchorId(filename);
		if (typeof document === 'undefined') return;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

</script>

<main class="flex-1 overflow-y-auto">
	<div class="mx-auto w-full max-w-[1600px] space-y-6 px-6 pt-8 pb-16">
		<Card.Root class="border border-border/60 bg-card/70">
		<Card.Content class="space-y-4 p-6">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<PageHeader
					icon={GitDiff}
					label="Review"
					title="Code Changes"
					description={`${data.task.issueTitle} · ${data.task.repoOwner}/${data.task.repoName} · #${data.task.issueNumber}`}
				/>
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
			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
					<NotePencil size={18} weight="bold" class="text-muted-foreground" />
				</div>
				<div class="space-y-0.5">
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Context</p>
					<h2 class="text-base font-semibold text-foreground">Issue Context</h2>
				</div>
			</div>
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
			<div class="flex items-center justify-end gap-2">
				<Button
						variant={diffLayout === 'split' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => (diffLayout = 'split')}
					>
						Split
					</Button>
				<Button
						variant={diffLayout === 'stacked' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => (diffLayout = 'stacked')}
					>
						Stacked
					</Button>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4 pt-0">
			{#if data.files.length === 0}
				<p class="text-sm text-muted-foreground">No file changes found for this pull request.</p>
			{:else}
				<div class="rounded-lg border border-border/60 bg-background/70 p-3">
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Files</p>
					<div class="mt-3 grid gap-2 sm:grid-cols-2">
						{#each data.files as file}
							<button
								type="button"
								class="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-left text-xs hover:border-border"
								onclick={() => scrollToFile(file.filename)}
							>
								<span class="truncate font-mono text-foreground/85">{file.filename}</span>
								<div class="flex items-center gap-2">
									<GitDiffBadge variant="add" value={file.additions} />
									<GitDiffBadge variant="remove" value={file.deletions} />
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#each data.files as file}
				<div id={getAnchorId(file.filename)} class="scroll-mt-24">
					<DiffViewer
						filename={file.filename}
						before={file.beforeContent}
						after={file.afterContent}
						language={file.language}
						status={file.status}
						layout={diffLayout}
					/>
				</div>
			{/each}
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
</main>

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
