<script lang="ts">
	export let beforeUrl: string;
	export let afterUrl: string;
	export let filename: string;
</script>

<div class="overflow-hidden rounded-lg border border-border/60 bg-background">
	<div class="bg-muted/50 px-4 py-2 text-sm font-medium text-foreground">
		{filename}
	</div>
	<iframe
		src={`https://diffs.com/embed?left=${encodeURIComponent(beforeUrl)}&right=${encodeURIComponent(afterUrl)}`}
		width="100%"
		height="600"
		class="border-0"
		title={`Code diff for ${filename}`}
	></iframe>
</div>
