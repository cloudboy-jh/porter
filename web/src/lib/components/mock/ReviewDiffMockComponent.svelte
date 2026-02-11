<script lang="ts">
	import { GitDiff, GitPullRequest } from 'phosphor-svelte';
	import DiffViewer from '$lib/components/DiffViewer.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import GitDiffBadge from '$lib/components/GitDiffBadge.svelte';

	let layout = $state<'split' | 'stacked'>('split');
	let showFullDiff = $state(false);
	let reviewState = $state<'idle' | 'merged' | 'rejected'>('idle');

	const before = `export const summarize = (text: string) => {
  if (!text.trim()) return 'No summary.';
  return text.slice(0, 180);
};
`;

	const after = `export const summarize = (text: string) => {
  const cleaned = text.trim();
  if (!cleaned) return 'No summary available.';

  const sentence = cleaned.split(/[.!?]/)[0] ?? cleaned;
  return sentence.slice(0, 220);
};
`;
 	const mockIssueUrl = 'https://github.com/example/repo/issues/42';

</script>

<Card.Root class="border border-border/60 bg-card/70">
	<Card.Header class="pb-2">
		<div class="flex items-center justify-between gap-3">
			<PageHeader icon={GitDiff} label="Review" title="Code Changes" description="Mock review diff" />
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					class="rounded-lg border border-border/40 px-4 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:border-red-500/40 hover:text-red-400"
					disabled={reviewState !== 'idle'}
					onclick={() => (reviewState = 'rejected')}
				>
					{reviewState === 'rejected' ? 'Rejected' : 'Reject'}
				</Button>
				<Button
					class="gap-2 rounded-lg bg-emerald-600/80 px-4 py-2 text-sm text-white transition-colors duration-150 hover:bg-emerald-600"
					disabled={reviewState !== 'idle'}
					onclick={() => (reviewState = 'merged')}
				>
					<GitPullRequest size={16} weight="bold" class="shrink-0 text-white" />
					{reviewState === 'merged' ? 'Merged' : 'Approve & merge'}
				</Button>
			</div>
		</div>
	</Card.Header>
	<Card.Content class="space-y-4 pt-0">
		<div class="mt-4 mb-4 flex items-center gap-3 rounded-lg border border-border/20 bg-muted/30 px-4 py-3">
			<p class="min-w-0 flex-1 line-clamp-2 text-sm text-muted-foreground">
				Tightened summarization logic to prefer the first complete sentence and avoid empty fallback copy.
			</p>
			<a
				class="shrink-0 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
				href={mockIssueUrl}
				target="_blank"
				rel="noreferrer"
			>
				#42
			</a>
			<div class="flex shrink-0 items-center gap-2">
				<GitDiffBadge variant="remove" value={2} />
				<GitDiffBadge variant="add" value={5} />
			</div>
		</div>
		<div class="flex items-center justify-between gap-3">
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
					<Button variant={layout === 'split' ? 'secondary' : 'ghost'} size="sm" onclick={() => (layout = 'split')}>
						Split
					</Button>
					<Button
						variant={layout === 'stacked' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => (layout = 'stacked')}
					>
						Stacked
					</Button>
				</div>
			{/if}
		</div>
		{#if showFullDiff}
			<DiffViewer
				filename="src/lib/server/summarize.ts"
				before={before}
				after={after}
				language="typescript"
				layout={layout}
				status="modified"
			/>
		{/if}
	</Card.Content>
</Card.Root>
