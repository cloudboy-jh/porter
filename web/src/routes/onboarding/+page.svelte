<script lang="ts">
	import { CheckCircle, GithubLogo, ShieldCheck, Stack, UsersThree } from 'phosphor-svelte';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	const steps = [
		{ id: 'connect', label: 'Connect GitHub' },
		{ id: 'repos', label: 'Select Repos' },
		{ id: 'agents', label: 'Choose Agents' },
		{ id: 'review', label: 'Review' }
	];

	const repos = [
		{ name: 'porter/porter', status: 'Ready', description: 'Core orchestration service' },
		{ name: 'porter/web', status: 'Ready', description: 'Dashboard + API routes' },
		{ name: 'porter/modal', status: 'Install app', description: 'Modal execution layer' }
	];

	const agents = [
		{ name: 'Opencode', provider: 'Anthropic', enabled: true },
		{ name: 'Claude Code', provider: 'Anthropic', enabled: true },
		{ name: 'Aider', provider: 'OpenAI', enabled: false }
	];

	const appInstallUrl =
		env.PUBLIC_GITHUB_APP_INSTALL_URL || 'https://github.com/apps/porter/installations/new';
</script>

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
				<p class="text-xs text-muted-foreground">GitHub app is not installed yet.</p>
				<Button variant="secondary" size="sm" class="gap-2" href={appInstallUrl}>
					<GithubLogo size={14} weight="bold" />
					Install GitHub App
				</Button>
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
					<Button class="gap-2" href={appInstallUrl}>
						<GithubLogo size={16} weight="bold" />
						Install GitHub App
					</Button>
					<Button variant="secondary">View permissions</Button>
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
				<Input placeholder="Search repositories" />
				<div class="space-y-3">
					{#each repos as repo}
						<div class="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-3">
							<div>
								<p class="text-sm font-medium text-foreground">{repo.name}</p>
								<p class="text-xs text-muted-foreground">{repo.description}</p>
							</div>
							<Button variant={repo.status === 'Ready' ? 'secondary' : 'ghost'} size="sm">
								{repo.status}
							</Button>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border border-border/60 bg-card/70">
			<Card.Content class="space-y-5 p-6">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 3</p>
					<h2 class="text-lg font-semibold text-foreground">Choose agents</h2>
					<p class="text-sm text-muted-foreground">Enable and prioritize the agents you want available.</p>
				</div>
				<div class="grid gap-3 md:grid-cols-3">
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
			</Card.Content>
		</Card.Root>

		<Card.Root class="border border-border/60 bg-card/70">
			<Card.Content class="space-y-4 p-6">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 4</p>
					<h2 class="text-lg font-semibold text-foreground">Review & finish</h2>
					<p class="text-sm text-muted-foreground">Confirm your workspace setup.</p>
				</div>
				<div class="grid gap-3 md:grid-cols-3">
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
					<Button size="lg">Finish setup</Button>
					<Button variant="secondary" size="lg">Back</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</section>
</div>
