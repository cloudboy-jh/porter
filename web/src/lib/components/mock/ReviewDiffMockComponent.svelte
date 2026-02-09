<script lang="ts">
	import { GitDiff } from 'phosphor-svelte';
	import DiffViewer from '$lib/components/DiffViewer.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let layout = $state<'split' | 'stacked'>('split');

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
</script>

<Card.Root class="border border-border/60 bg-card/70">
	<Card.Header class="pb-2">
		<div class="flex items-center justify-between gap-3">
			<PageHeader icon={GitDiff} label="Review" title="Code Changes" description="Mock review diff" />
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
		</div>
	</Card.Header>
	<Card.Content class="space-y-4 pt-0">
		<DiffViewer
			filename="src/lib/server/summarize.ts"
			before={before}
			after={after}
			language="typescript"
			layout={layout}
			status="modified"
		/>
	</Card.Content>
</Card.Root>
