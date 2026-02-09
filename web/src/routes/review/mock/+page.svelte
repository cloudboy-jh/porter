<script lang="ts">
	import ReviewDiffMockComponent from '$lib/components/mock/ReviewDiffMockComponent.svelte';

	const mockDiffFileCount = 1;
	const isCompactReviewDiff = mockDiffFileCount >= 1 && mockDiffFileCount <= 3;
</script>

<div class={`flex min-h-full justify-center py-4 ${isCompactReviewDiff ? 'items-center' : 'items-start'}`}>
	<div class="mx-auto w-full max-w-[1200px]">
		<ReviewDiffMockComponent />
	</div>
</div>
