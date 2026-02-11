<script lang="ts">
	import { GitDiff, GitPullRequest } from 'phosphor-svelte';
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
	let rejectConfirmOpen = $state(false);
	let isMerging = $state(false);
	let isRejecting = $state(false);
	let mergeError = $state('');
	let rejectError = $state('');
	let mergeSuccess = $state(false);
	let rejectSuccess = $state(false);
	let diffLayout = $state<'split' | 'stacked'>('split');
	let showFullDiff = $state(false);

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

	const handleReject = async () => {
		if (isRejecting) return;
		isRejecting = true;
		rejectError = '';
		try {
			const response = await fetch('/api/review/reject', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					taskId: data.task.id,
					repoOwner: data.task.repoOwner,
					repoName: data.task.repoName,
					issueNumber: data.task.issueNumber,
					summary: 'Rejected in review. Please revise and resubmit.'
				})
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { error?: string } | null;
				rejectError = payload?.error ?? 'Reject failed.';
				return;
			}
			rejectSuccess = true;
			rejectConfirmOpen = false;
		} catch {
			rejectError = 'Reject failed.';
		} finally {
			isRejecting = false;
		}
	};

	const getAnchorId = (filename: string) => `diff-${filename.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

	const scrollToFile = (filename: string) => {
		const id = getAnchorId(filename);
		if (typeof document === 'undefined') return;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};


	const issueHref = $derived.by(() => {
		if (data.task.issueUrl) return data.task.issueUrl;
		if (data.task.repoOwner && data.task.repoName && data.task.issueNumber) {
			return `https://github.com/${data.task.repoOwner}/${data.task.repoName}/issues/${data.task.issueNumber}`;
		}
		return null;
	});

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
				<div class="flex flex-wrap items-center justify-end gap-2">
					<Button
						variant="outline"
						class="rounded-lg border border-border/40 px-4 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:border-red-500/40 hover:text-red-400"
						onclick={() => (rejectConfirmOpen = true)}
						disabled={mergeSuccess || rejectSuccess || isMerging || isRejecting}
					>
						{isRejecting ? 'Rejecting...' : rejectSuccess ? 'Rejected' : 'Reject'}
					</Button>
					{#if data.canMerge}
						<Button
							class="gap-2 rounded-lg bg-emerald-600/80 px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-emerald-600"
							onclick={() => (confirmOpen = true)}
							disabled={mergeSuccess || rejectSuccess || isMerging || isRejecting}
						>
							<GitPullRequest size={16} weight="bold" class="shrink-0 text-white" />
							{isMerging ? 'Merging...' : mergeSuccess ? 'Merged' : 'Approve & merge'}
						</Button>
					{/if}
					<Badge variant="outline" class="text-[10px] uppercase border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
						Ready
					</Badge>
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
				<span class="text-muted-foreground/60">&bull;</span>
				<Button variant="ghost" size="sm" class="h-auto px-0 text-xs text-primary hover:text-primary/80" href={data.pr.htmlUrl} target="_blank" rel="noreferrer">
					View PR in GitHub
				</Button>
				{#if !data.canMerge}
					<span class="text-muted-foreground/60">&bull;</span>
					<span>Merge permission required</span>
				{/if}
			</div>
			{#if mergeError}
				<p class="text-xs text-destructive">{mergeError}</p>
			{/if}
			{#if rejectError}
				<p class="text-xs text-destructive">{rejectError}</p>
			{/if}
		</Card.Content>
		</Card.Root>

		<div class="mt-4 mb-4 flex items-center gap-3 rounded-lg border border-border/20 bg-muted/30 px-4 py-3">
			<p class="min-w-0 flex-1 line-clamp-2 text-sm text-muted-foreground">
				{data.task.summary || 'No summary provided by the agent.'}
			</p>
			{#if issueHref && data.task.issueNumber}
				<a
					class="shrink-0 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
					href={issueHref}
					target="_blank"
					rel="noreferrer"
				>
					#{data.task.issueNumber}
				</a>
			{/if}
			<div class="flex shrink-0 items-center gap-2">
				<GitDiffBadge variant="remove" value={data.pr.deletions} />
				<GitDiffBadge variant="add" value={data.pr.additions} />
			</div>
		</div>

		<Card.Root class="border border-border/60 bg-card/70">
		<Card.Header class="pb-2">
			<div class="flex items-center justify-between gap-2">
				<Button
					variant="ghost"
					size="sm"
					class="h-8 px-0 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
					onclick={() => (showFullDiff = !showFullDiff)}
				>
					{showFullDiff ? 'Hide full diff' : 'Show full diff'}
				</Button>
				{#if showFullDiff}
				<div class="flex items-center gap-2">
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
				{/if}
			</div>
		</Card.Header>
		<Card.Content class="space-y-4 pt-0">
			{#if !showFullDiff}
				<p class="text-sm text-muted-foreground">Use "Show full diff" to inspect file-level changes.</p>
			{:else if data.files.length === 0}
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
			<Button class="gap-2 rounded-lg bg-emerald-600/80 px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-emerald-600" onclick={handleMerge} disabled={isMerging}>
				<GitPullRequest size={16} weight="bold" class="shrink-0 text-white" />
				{isMerging ? 'Merging...' : 'Confirm merge'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={rejectConfirmOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Reject this PR?</Dialog.Title>
			<Dialog.Description>
				This marks the task as rejected in Porter and asks for revisions. The GitHub PR stays open.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex gap-2">
			<Button variant="secondary" onclick={() => (rejectConfirmOpen = false)} disabled={isRejecting}>
				Cancel
			</Button>
			<Button variant="outline" class="rounded-lg border border-border/40 px-4 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:border-red-500/40 hover:text-red-400" onclick={handleReject} disabled={isRejecting}>
				{isRejecting ? 'Rejecting...' : 'Confirm reject'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
