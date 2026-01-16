<script lang="ts">
	import favicon from '../logos/porter-logo-main.png';
	import '../shadcn.css';
	import '../app.css';
	import { page } from '$app/stores';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import { SidebarInset, SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar/index.js';

	const headerMap: Record<string, { title: string; breadcrumb: string; subtitle: string }> = {
		'/': {
			title: 'Active Tasks',
			breadcrumb: 'Porter › Active Tasks',
			subtitle: ''
		},
		'/history': {
			title: 'Task History',
			breadcrumb: 'Porter › Task History',
			subtitle: 'Review finished tasks and outcomes.'
		},
		'/settings': {
			title: 'Settings',
			breadcrumb: 'Porter › Settings',
			subtitle: 'Tune execution mode, agents, and connections.'
		}
	};

	let sidebarOpen = $state(false);
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<SidebarProvider style="--sidebar-width: 18rem; --sidebar-width-mobile: 20rem;" bind:open={sidebarOpen}>
	<AppSidebar />
	<SidebarInset class="page-grid">
		<header class="flex h-16 items-center justify-between gap-4 border-b border-border px-6">
			<div class="flex items-center gap-3">
				<SidebarTrigger />
				<p class="text-sm font-semibold text-foreground">
					{headerMap[$page.url.pathname]?.breadcrumb ?? 'Porter'}
				</p>
			</div>
			<p class="hidden text-sm text-muted-foreground md:block">
				{headerMap[$page.url.pathname]?.subtitle ?? ''}
			</p>
		</header>
		<div class="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
			{@render children()}
		</div>
	</SidebarInset>
</SidebarProvider>
