<script lang="ts">
	import { GitDiff, GitPullRequest } from 'phosphor-svelte';
	import DiffViewer from '$lib/components/DiffViewer.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import GitDiffBadge from '$lib/components/GitDiffBadge.svelte';

	let layout = $state<'split' | 'stacked'>('split');
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
	const mockPrUrl = 'https://github.com/example/repo/pull/42';

</script>

<Card.Root class="border border-border/60 bg-card/70">
	<Card.Header class="pb-1 pt-3">
		<div class="flex items-center justify-between gap-3">
			<PageHeader icon={GitDiff} title="Code Changes" description="Mock review diff" />
			<div class="flex items-center gap-2">
				<Button
					variant="ghost"
					class="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
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
		<div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
			<a class="text-muted-foreground hover:text-foreground" href={mockPrUrl} target="_blank" rel="noreferrer">
				PR #42
			</a>
			<span class="text-muted-foreground/60">&bull;</span>
			<Button variant="ghost" size="sm" class="h-auto px-0 text-xs text-primary hover:text-primary/80" href={mockPrUrl} target="_blank" rel="noreferrer">
				View PR in GitHub
			</Button>
		</div>
	</Card.Header>
	<Card.Content class="space-y-3 pt-0">
		<div class="mb-3 rounded-lg border border-border/30 bg-muted/35 px-4 py-3">
			<div class="flex items-center justify-between gap-4">
				<div class="min-w-0 flex-1">
					<p class="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
					<p class="mt-1 text-[0.98rem] font-semibold tracking-tight leading-6 text-foreground">
						Tightened summarization logic to prefer the first complete sentence and avoid empty fallback copy.
					</p>
				</div>
				<a
					class="shrink-0 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
					href={mockIssueUrl}
					target="_blank"
					rel="noreferrer"
				>
					Issue #42
				</a>
			</div>
		</div>
		<div class="relative overflow-hidden rounded-lg border border-border/60 bg-card/75">
			<div class="pointer-events-none absolute right-3 top-2 z-10 flex items-center gap-2 whitespace-nowrap">
				<Button variant={layout === 'split' ? 'secondary' : 'ghost'} size="sm" class="pointer-events-auto" onclick={() => (layout = 'split')}>
					Split
				</Button>
				<Button
					variant={layout === 'stacked' ? 'secondary' : 'ghost'}
					size="sm"
					class="pointer-events-auto"
					onclick={() => (layout = 'stacked')}
				>
					Stacked
				</Button>
				<GitDiffBadge variant="remove" value={2} />
				<GitDiffBadge variant="add" value={5} />
			</div>
			<DiffViewer
				filename="src/lib/server/summarize.ts"
				before={before}
				after={after}
				language="typescript"
				layout={layout}
				status="modified"
				embedded={true}
			/>
		</div>
	</Card.Content>
</Card.Root>
