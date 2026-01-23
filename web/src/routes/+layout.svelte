<script lang="ts">
	import favicon from '../logos/porter-logo-main.png';
	import '../shadcn.css';
	import '../app.css';
	import { page } from '$app/stores';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import { SidebarInset, SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar/index.js';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';

	const headerMap: Record<
		string,
		{ title: string; breadcrumb: Array<{ label: string; href?: string }>; subtitle: string }
	> = {
		'/': {
			title: 'Active Tasks',
			breadcrumb: [
				{ label: 'porter', href: '/' },
				{ label: 'tasks' },
				{ label: 'active' }
			],
			subtitle: ''
		},
		'/history': {
			title: 'Task History',
			breadcrumb: [
				{ label: 'porter', href: '/' },
				{ label: 'tasks' },
				{ label: 'history' }
			],
			subtitle: ''
		},
		'/settings': {
			title: 'Settings',
			breadcrumb: [
				{ label: 'porter', href: '/' },
				{ label: 'settings' }
			],
			subtitle: ''
		},
		'/account': {
			title: 'Account',
			breadcrumb: [
				{ label: 'porter', href: '/' },
				{ label: 'account' }
			],
			subtitle: 'Profile, workspace access, and connections.'
		},
		'/auth': {
			title: 'Sign in',
			breadcrumb: [
				{ label: 'porter', href: '/' },
				{ label: 'auth' }
			],
			subtitle: 'Authorize GitHub to connect your workspace.'
		},
		'/onboarding': {
			title: 'Onboarding',
			breadcrumb: [
				{ label: 'porter', href: '/' },
				{ label: 'onboarding' }
			],
			subtitle: 'Set up GitHub, repos, and agents.'
		}
	};

	const shelllessRoutes = new Set(['/auth', '/onboarding']);

	let sidebarOpen = $state(false);
	let { children, data } = $props();
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

{#if shelllessRoutes.has($page.url.pathname)}
	<div class="min-h-screen bg-background px-6 py-10">
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-10">
			{@render children()}
		</div>
	</div>
{:else}
	<SidebarProvider style="--sidebar-width: 18rem; --sidebar-width-mobile: 20rem;" bind:open={sidebarOpen}>
		<AppSidebar />
		<SidebarInset class="page-grid">
			<header class="flex h-16 items-center justify-between gap-4 border-b border-border px-6">
				<div class="flex items-center gap-3">
					<SidebarTrigger />
					<Breadcrumb items={headerMap[$page.url.pathname]?.breadcrumb ?? [{ label: 'porter' }]} />
				</div>
				{#if headerMap[$page.url.pathname]?.subtitle}
					<p class="hidden text-sm text-muted-foreground md:block">
						{headerMap[$page.url.pathname]?.subtitle}
					</p>
				{/if}
			</header>
			<div class="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
				{@render children()}
			</div>
		</SidebarInset>
	</SidebarProvider>
{/if}
