<script lang="ts">
	import { onMount } from 'svelte';
	import { CheckCircle, GithubLogo, ShieldCheck, Stack, UsersThree } from 'phosphor-svelte';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { PageData } from './$types';
	import logo from '../../logos/porter-logo-main.png';

	type Repo = {
		id: number;
		fullName: string;
		owner: string;
		name: string;
		private: boolean;
		description: string | null;
	};

	const steps = [
		{ id: 'connect', label: 'Connect GitHub' },
		{ id: 'repos', label: 'Select Repos' },
		{ id: 'agents', label: 'Choose Agents' },
		{ id: 'review', label: 'Review' }
	];

	const agents = [
		{ name: 'Opencode', provider: 'Anthropic', enabled: true },
		{ name: 'Claude Code', provider: 'Anthropic', enabled: true },
		{ name: 'Aider', provider: 'OpenAI', enabled: false }
	];

	const appInstallUrl =
		env.PUBLIC_GITHUB_APP_INSTALL_URL || 'https://github.com/apps/porter/installations/new';

	let { data } = $props<{ data: PageData }>();
	let repos = $state<Repo[]>([]);
	let repoSearch = $state('');
	let isLoadingRepos = $state(false);
	let repoError = $state('');
	let hasInstallation = $state(Boolean(data?.session?.hasInstallation));

	const filteredRepos = $derived(
		repoSearch
			? repos.filter((repo) => repo.fullName.toLowerCase().includes(repoSearch.toLowerCase()))
			: repos
	);

	onMount(async () => {
		isLoadingRepos = true;
		repoError = '';
		try {
			const response = await fetch('/api/github/repositories');
			if (!response.ok) throw new Error('Failed to load repositories');
			const payload = (await response.json()) as {
				repositories: Repo[];
				hasInstallation: boolean;
			};
			repos = payload.repositories ?? [];
			hasInstallation = payload.hasInstallation;
		} catch (error) {
			repoError = error instanceof Error ? error.message : 'Failed to load repositories';
		} finally {
			isLoadingRepos = false;
		}
	});
</script>

<div class="space-y-8">
	<header class="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-6 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-4">
			<img src={logo} alt="Porter" class="h-12 w-12 rounded-2xl border border-border/60 bg-background/70 p-2" />
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Onboarding</p>
				<h1 class="text-2xl font-semibold text-foreground">Workspace Setup</h1>
				<p class="text-sm text-muted-foreground">
					Connect GitHub, install the app, and choose where Porter will ship code.
				</p>
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button variant="secondary">View setup docs</Button>
			<Button href={appInstallUrl} class="gap-2">
				<GithubLogo size={16} weight="bold" />
				Install GitHub App
			</Button>
		</div>
	</header>

	<div class="grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
	<section class="space-y-4">
		<Card.Root class="border border-border/60 bg-card/70">
			<Card.Content class="space-y-4 p-5">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Onboarding</p>
				<h1 class="text-lg font-semibold text-foreground">Workspace Setup</h1>
				<div class="space-y-3">
					{#each steps as step, index}
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-xs font-semibold">
								{index + 1}
							</div>
							<div>
								<p class="text-sm font-medium text-foreground">{step.label}</p>
								<p class="text-xs text-muted-foreground">In progress</p>
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="border border-border/60 bg-background/70">
			<Card.Content class="space-y-3 p-5">
				<div class="flex items-center gap-3 text-sm font-medium">
					<span class="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-muted/70">
						<ShieldCheck size={16} weight="bold" class="text-muted-foreground" />
					</span>
					Workspace status
				</div>
				{#if hasInstallation}
					<p class="text-xs text-muted-foreground">GitHub app is installed.</p>
					<div class="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-emerald-600">
						<CheckCircle size={14} weight="bold" />
						Installed
					</div>
				{:else}
					<p class="text-xs text-muted-foreground">
						Required: install the GitHub app to enable webhooks and automation.
					</p>
					<Button variant="secondary" size="sm" class="gap-2" href={appInstallUrl}>
						<GithubLogo size={14} weight="bold" />
						Install GitHub App
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	</section>

	<section class="space-y-6">
		<Card.Root class="border border-border/60 bg-card/70 shadow-[0_18px_36px_-28px_rgba(15,15,15,0.5)]">
			<Card.Content class="space-y-6 p-6">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 1</p>
					<h2 class="text-lg font-semibold text-foreground">Connect GitHub</h2>
					<p class="text-sm text-muted-foreground">
						Install the Porter GitHub App and authorize access to the repositories you want to automate.
					</p>
				</div>
				<div class="flex flex-wrap gap-3">
					{#if hasInstallation}
						<Button variant="secondary">Review permissions</Button>
					{:else}
						<Button class="gap-2" href={appInstallUrl}>
							<GithubLogo size={16} weight="bold" />
							Install GitHub App
						</Button>
						<Button variant="secondary">View permissions</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border border-border/60 bg-card/70">
			<Card.Content class="space-y-5 p-6">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 2</p>
					<h2 class="text-lg font-semibold text-foreground">Select repositories</h2>
					<p class="text-sm text-muted-foreground">Choose where Porter should listen for issues.</p>
				</div>
				<div class={hasInstallation ? '' : 'opacity-50 pointer-events-none'}>
					<Input bind:value={repoSearch} placeholder="Search repositories" disabled={!hasInstallation} />
					{#if isLoadingRepos}
						<div class="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
							Loading repositories...
						</div>
					{:else if repoError}
						<div class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
							{repoError}
						</div>
					{:else if filteredRepos.length === 0}
						<div class="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
							No repositories found.
						</div>
					{:else}
						<div class="space-y-3">
							{#each filteredRepos as repo}
								<div class="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-3">
									<div>
										<p class="text-sm font-medium text-foreground">{repo.fullName}</p>
										<p class="text-xs text-muted-foreground">
											{repo.description ?? 'Repository access granted.'}
										</p>
									</div>
									<Button variant="secondary" size="sm">Ready</Button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				{#if !hasInstallation}
					<div class="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
						Install the GitHub App to unlock repository selection.
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="border border-border/60 bg-card/70">
			<Card.Content class="space-y-5 p-6">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 3</p>
					<h2 class="text-lg font-semibold text-foreground">Choose agents</h2>
					<p class="text-sm text-muted-foreground">Enable and prioritize the agents you want available.</p>
				</div>
				<div class={`grid gap-3 md:grid-cols-3 ${hasInstallation ? '' : 'opacity-50 pointer-events-none'}`}>
					{#each agents as agent}
						<div class="rounded-xl border border-border/60 bg-background/70 p-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-foreground">{agent.name}</p>
									<p class="text-xs text-muted-foreground">{agent.provider}</p>
								</div>
								{#if agent.enabled}
									<CheckCircle size={16} weight="bold" class="text-emerald-600" />
								{:else}
									<Stack size={16} weight="bold" class="text-muted-foreground" />
								{/if}
							</div>
							<Button variant={agent.enabled ? 'secondary' : 'ghost'} size="sm" class="mt-3 w-full">
								{agent.enabled ? 'Enabled' : 'Enable'}
							</Button>
						</div>
					{/each}
				</div>
				{#if !hasInstallation}
					<div class="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
						Install the GitHub App to enable agents for selected repositories.
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="border border-border/60 bg-card/70">
			<Card.Content class="space-y-4 p-6">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 4</p>
					<h2 class="text-lg font-semibold text-foreground">Review & finish</h2>
					<p class="text-sm text-muted-foreground">Confirm your workspace setup.</p>
				</div>
				<div class={`grid gap-3 md:grid-cols-3 ${hasInstallation ? '' : 'opacity-50 pointer-events-none'}`}>
					<div class="rounded-xl border border-border/60 bg-background/70 p-4">
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<UsersThree size={14} weight="bold" />
							Workspaces
						</div>
						<p class="mt-2 text-sm font-medium text-foreground">2 connected repos</p>
					</div>
					<div class="rounded-xl border border-border/60 bg-background/70 p-4">
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<Stack size={14} weight="bold" />
							Agents enabled
						</div>
						<p class="mt-2 text-sm font-medium text-foreground">2 active agents</p>
					</div>
					<div class="rounded-xl border border-border/60 bg-background/70 p-4">
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<ShieldCheck size={14} weight="bold" />
							Permissions
						</div>
						<p class="mt-2 text-sm font-medium text-foreground">Ready to run</p>
					</div>
				</div>
				<div class="flex flex-wrap gap-3">
					<Button size="lg" disabled={!hasInstallation}>Finish setup</Button>
					<Button variant="secondary" size="lg">Back</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</section>
</div>
</div>
