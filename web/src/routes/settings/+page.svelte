<script lang="ts">
	import { GithubLogo, Robot, Stack, Gear } from 'phosphor-svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import AgentSettingsDialog from '$lib/components/AgentSettingsDialog.svelte';
	import type { PageData } from './$types';
	import type { AgentConfig } from '$lib/types/agent';

	type AgentDisplay = AgentConfig & { readyState?: 'ready' | 'missing_credentials' | 'disabled' };
	type Credentials = { anthropic?: string; openai?: string; amp?: string };
	type FlyValidation = {
		ok: boolean;
		status: 'ready' | 'missing' | 'invalid_token' | 'error';
		message: string;
		appCreated: boolean;
	};
	type FlyCredentials = { flyToken?: string; flyAppName?: string; validation?: FlyValidation };
	type RepoSummary = {
		id: number;
		fullName: string;
		owner: string;
		name: string;
		private: boolean;
		description?: string | null;
	};
	type ConfigSnapshot = {
		credentials?: Credentials;
		flyToken?: string;
		flyAppName?: string;
		onboarding?: {
			completed: boolean;
			selectedRepos: Array<{
				id: number;
				fullName: string;
				owner: string;
				name: string;
				private: boolean;
			}>;
			enabledAgents: string[];
		};
	};

	let { data } = $props<{ data: PageData }>();
	let agentConfig = $state<AgentDisplay[]>([]);
	let credentials = $state<Credentials>({});
	let fly = $state<FlyCredentials>({});
	let repositories = $state<RepoSummary[]>([]);
	let selectedRepoIds = $state<number[]>([]);
	let configSnapshot = $state<ConfigSnapshot | null>(null);
	let credentialStatus = $state('');
	let credentialSaving = $state(false);
	let flyStatus = $state('');
	let flySaving = $state(false);
	let flyValidating = $state(false);
	let flyValidation = $state<FlyValidation | null>(null);
	let repoStatus = $state('');
	let repoSaving = $state(false);
	let repoLoading = $state(false);
	let revealCredential = $state<Record<string, boolean>>({});
	let showCredentials = $state(false);
	let showRepos = $state(false);
	let showAgents = $state(false);
	let repoSearch = $state('');
	const isConnected = $derived(Boolean(data?.session));

	const enabledAgents = $derived(agentConfig.filter((agent) => agent.enabled).length);
	const readyAgents = $derived(
		agentConfig.filter((agent) => (agent.readyState ? agent.readyState === 'ready' : agent.enabled))
	);
	const readyAgentCount = $derived(readyAgents.length);
	const totalAgents = $derived(agentConfig.length);
	const flyReady = $derived(Boolean(fly?.flyToken?.trim()) && Boolean(fly?.flyAppName?.trim()));
	const flyValidationReady = $derived(Boolean(flyValidation?.ok));
	const anthropicReady = $derived(Boolean(credentials?.anthropic?.trim()));
	const reposReady = $derived(selectedRepoIds.length > 0);
	const runtimeReady = $derived(
		isConnected && flyReady && flyValidationReady && anthropicReady && readyAgentCount > 0 && reposReady
	);
	const webhookReady = $derived(isConnected && flyValidationReady && readyAgentCount > 0);
	const filteredRepos = $derived(
		repoSearch
			? repositories.filter((repo) =>
				repo.fullName.toLowerCase().includes(repoSearch.toLowerCase())
			)
			: repositories
	);

	const loadAgents = async (force = false) => {
		try {
			const response = await fetch(force ? '/api/agents/scan' : '/api/agents', {
				method: force ? 'POST' : 'GET'
			});
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) return;
			const data = await response.json();
			agentConfig = data as AgentConfig[];
		} catch {
			// ignore
		}
	};

	const github = $derived({
		connected: Boolean(data?.session),
		handle: data?.session?.user?.login ? `@${data.session.user.login}` : 'Not connected',
		lastSync: data?.session ? 'Just now' : '—'
	});

	const refreshRuntime = () => {
		loadAgents(true);
		loadConfig();
		loadRepositories();
		validateFly(false);
	};

	const credentialProviders = [
		{
			key: 'anthropic' as const,
			label: 'Anthropic',
			note: 'Used by Opencode and Claude Code.'
		},
		{
			key: 'amp' as const,
			label: 'Amp',
			note: 'Required to run Amp tasks.'
		},
		{
			key: 'openai' as const,
			label: 'OpenAI',
			note: 'Optional, reserved for future agents.'
		}
	];

	const headerLabelClass =
		'text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground';

	onMount(() => {
		loadAgents(true);
		if (isConnected) {
			loadConfig();
			loadRepositories();
		}
	});

	const loadConfig = async () => {
		try {
			const response = await fetch('/api/config');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) return;
			const data = (await response.json()) as ConfigSnapshot;
			credentials = data.credentials ?? {};
			fly = { flyToken: data.flyToken, flyAppName: data.flyAppName };
			configSnapshot = data;
			selectedRepoIds = data.onboarding?.selectedRepos?.map((repo) => repo.id) ?? [];
			if (data.flyToken && data.flyAppName) {
				validateFly(false);
			}
		} catch {
			// ignore
		}
	};

	const loadRepositories = async () => {
		repoLoading = true;
		repoStatus = '';
		try {
			const response = await fetch('/api/github/repositories');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				repoStatus = 'Failed to load repositories.';
				repositories = [];
				return;
			}
			const payload = (await response.json()) as { repositories: RepoSummary[] };
			repositories = payload.repositories ?? [];
			if (!selectedRepoIds.length && repositories.length) {
				selectedRepoIds = repositories.map((repo) => repo.id);
			}
		} catch (error) {
			console.error('Failed to load repositories:', error);
			repoStatus = 'Failed to load repositories.';
			repositories = [];
		} finally {
			repoLoading = false;
		}
	};

	const toggleReveal = (key: string) => {
		revealCredential = { ...revealCredential, [key]: !revealCredential[key] };
	};

	const rotateCredential = (key: string) => {
		credentials = { ...credentials, [key]: '' };
		revealCredential = { ...revealCredential, [key]: true };
	};

	const updateCredential = (key: string, value: string) => {
		credentials = { ...credentials, [key]: value };
	};

	const saveCredentials = async () => {
		credentialSaving = true;
		credentialStatus = '';
		try {
			const response = await fetch('/api/config/credentials', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials)
			});
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				credentialStatus = 'Failed to save credentials.';
				return;
			}
			const data = (await response.json()) as Credentials;
			credentials = data ?? {};
			credentialStatus = 'Credentials updated.';
			loadAgents(true);
		} catch (error) {
			console.error('Saving credentials failed:', error);
			credentialStatus = 'Failed to save credentials.';
		} finally {
			credentialSaving = false;
		}
	};

	const updateFlyToken = (value: string) => {
		fly = { ...fly, flyToken: value };
	};

	const updateFlyAppName = (value: string) => {
		fly = { ...fly, flyAppName: value };
	};

	const validateFly = async (showSuccess = true) => {
		flyValidating = true;
		if (showSuccess) {
			flyStatus = '';
		}
		try {
			const response = await fetch('/api/config/validate/fly');
			const data = (await response.json()) as FlyValidation;
			flyValidation = data;
			if (showSuccess) {
				flyStatus = data.message;
			}
		} catch (error) {
			console.error('Validating Fly credentials failed:', error);
			flyValidation = {
				ok: false,
				status: 'error',
				message: 'Failed to validate Fly credentials.',
				appCreated: false
			};
			if (showSuccess) {
				flyStatus = 'Failed to validate Fly credentials.';
			}
		} finally {
			flyValidating = false;
		}
	};

	const saveFly = async () => {
		flySaving = true;
		flyStatus = '';
		try {
			const response = await fetch('/api/config/fly', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...fly, validate: true })
			});
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				flyStatus = 'Failed to save Fly settings.';
				return;
			}
			const data = (await response.json()) as FlyCredentials;
			fly = { flyToken: data.flyToken, flyAppName: data.flyAppName };
			flyValidation = data.validation ?? null;
			flyStatus = data.validation?.message ?? 'Fly settings updated.';
		} catch (error) {
			console.error('Saving Fly settings failed:', error);
			flyStatus = 'Failed to save Fly settings.';
		} finally {
			flySaving = false;
		}
	};

	const toggleRepoSelection = (id: number) => {
		selectedRepoIds = selectedRepoIds.includes(id)
			? selectedRepoIds.filter((repoId) => repoId !== id)
			: [...selectedRepoIds, id];
	};

	const saveRepos = async () => {
		repoSaving = true;
		repoStatus = '';
		try {
			if (!configSnapshot) {
				repoStatus = 'Unable to update repository selection.';
				return;
			}
			const selectedRepos = repositories
				.filter((repo) => selectedRepoIds.includes(repo.id))
				.map((repo) => ({
					id: repo.id,
					fullName: repo.fullName,
					owner: repo.owner,
					name: repo.name,
					private: repo.private
				}));
			const nextConfig: ConfigSnapshot = {
				...configSnapshot,
				onboarding: {
					completed: true,
					selectedRepos,
					enabledAgents: configSnapshot.onboarding?.enabledAgents ?? []
				}
			};
			const response = await fetch('/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(nextConfig)
			});
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				repoStatus = 'Failed to save repositories.';
				return;
			}
			const updated = (await response.json()) as ConfigSnapshot;
			configSnapshot = updated;
			repoStatus = 'Repositories updated.';
		} catch (error) {
			console.error('Saving repositories failed:', error);
			repoStatus = 'Failed to save repositories.';
		} finally {
			repoSaving = false;
		}
	};
</script>


<div class="w-full max-w-[1200px] mx-auto space-y-6">
	{#if !isConnected}
		<EmptyState 
			icon={GithubLogo}
			title="Connect GitHub to unlock settings"
			description="Authorize Porter to configure agents, repos, and runtime preferences."
			actionLabel="Connect GitHub"
			actionHref="/api/auth/github"
			variant="hero"
		/>
	{/if}
	{#if isConnected}
		<div class="overflow-y-auto lg:h-[calc(100vh-190px)] lg:overflow-hidden">
			<div class="grid gap-4 lg:grid-cols-12 lg:auto-rows-[minmax(0,1fr)] lg:h-full">
				<Card.Root class="lg:col-span-8 border border-border/60 bg-card/70 shadow-lg backdrop-blur">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
									<div class="relative h-5 w-5">
										<span class="absolute left-0 top-0 h-3.5 w-3.5 rounded-md bg-foreground/80"></span>
										<span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary"></span>
									</div>
								</div>
								<div class="space-y-1">
									<p class={headerLabelClass}>Runtime</p>
									<h2 class="text-lg font-semibold text-foreground">Readiness Status</h2>
									<p class="text-xs text-muted-foreground">
										Cloud runtime readiness for Porter tasks.
									</p>
									<p class="text-xs text-muted-foreground">
										Webhook mentions: {webhookReady ? 'ready' : 'blocked'}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Badge variant={runtimeReady ? 'secondary' : 'outline'} class="text-xs">
									{runtimeReady ? 'Ready' : 'Not ready'}
								</Badge>
								<Button variant="ghost" size="sm" type="button" onclick={refreshRuntime}>
									Refresh
								</Button>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="grid gap-3 pt-0 sm:grid-cols-2 lg:grid-cols-4">
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">GitHub</p>
							<p class="mt-2 text-sm font-medium text-foreground">Connected</p>
							<p class="text-xs text-muted-foreground">{github.handle}</p>
						</div>
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fly</p>
						<p class="mt-2 text-sm font-medium text-foreground">
							{flyValidationReady ? 'Token + app ready' : flyReady ? 'Validation needed' : 'Missing token/app'}
						</p>
						<p class="text-xs text-muted-foreground">{fly?.flyAppName || 'No Fly app selected'}</p>
					</div>
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">LLM</p>
							<p class="mt-2 text-sm font-medium text-foreground">
								{anthropicReady ? 'Anthropic ready' : 'Missing Anthropic key'}
							</p>
							<p class="text-xs text-muted-foreground">Required for agents</p>
						</div>
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Repos</p>
							<p class="mt-2 text-sm font-medium text-foreground">
								{selectedRepoIds.length} selected
							</p>
							<p class="text-xs text-muted-foreground">Active scope</p>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="lg:col-span-4 border border-border/60 bg-card/70 shadow-lg backdrop-blur">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
									<Robot size={18} weight="bold" />
								</div>
								<div class="space-y-1">
									<p class={headerLabelClass}>Credentials</p>
							<h2 class="text-lg font-semibold text-foreground">Fly + LLM Keys</h2>
								</div>
							</div>
							<Button size="sm" variant="secondary" onclick={() => (showCredentials = true)}>
								Manage
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="grid gap-3 pt-0">
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fly</p>
						<p class="mt-2 text-sm font-medium text-foreground">
							{flyValidationReady ? 'Configured' : flyReady ? 'Needs validation' : 'Missing setup'}
						</p>
						<p class="text-xs text-muted-foreground">Cloud execution token</p>
					</div>
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Anthropic</p>
							<p class="mt-2 text-sm font-medium text-foreground">
								{anthropicReady ? 'Ready' : 'Missing key'}
							</p>
							<p class="text-xs text-muted-foreground">Required for agents</p>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="lg:col-span-6 border border-border/60 bg-card/70 shadow-lg backdrop-blur">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
									<GithubLogo size={18} weight="bold" />
								</div>
								<div class="space-y-1">
									<p class={headerLabelClass}>Repositories</p>
									<h2 class="text-lg font-semibold text-foreground">Scope</h2>
								</div>
							</div>
							<Button size="sm" variant="secondary" onclick={() => (showRepos = true)}>
								Manage
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="space-y-3 pt-0">
						<Input
							placeholder="Search repositories"
							class="h-10"
							bind:value={repoSearch}
						/>
						<div class="max-h-[240px] space-y-2 overflow-y-auto pr-1">
							{#if repoLoading}
								<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
									Loading repositories...
								</div>
							{:else if filteredRepos.length === 0}
								<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
									No repositories match that search.
								</div>
							{:else}
								{#each filteredRepos as repo}
									<div class="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs">
										<div>
											<p class="text-sm font-medium text-foreground">{repo.fullName}</p>
											{#if repo.description}
												<p class="text-xs text-muted-foreground">{repo.description}</p>
											{/if}
										</div>
										<Badge variant={selectedRepoIds.includes(repo.id) ? 'secondary' : 'outline'} class="text-xs">
											{selectedRepoIds.includes(repo.id) ? 'Selected' : 'Not selected'}
										</Badge>
									</div>
								{/each}
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="lg:col-span-4 border border-border/60 bg-card/70 shadow-lg backdrop-blur">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
									<Stack size={18} weight="bold" />
								</div>
								<div class="space-y-1">
									<p class={headerLabelClass}>Agents</p>
									<h2 class="text-lg font-semibold text-foreground">Agent Control</h2>
								</div>
							</div>
							<Button size="sm" variant="secondary" onclick={() => (showAgents = true)}>
								Manage
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="grid gap-3 pt-0">
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Enabled</p>
							<p class="mt-2 text-sm font-medium text-foreground">{enabledAgents} active</p>
							<p class="text-xs text-muted-foreground">{readyAgentCount} ready</p>
						</div>
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Coverage</p>
							<p class="mt-2 text-sm font-medium text-foreground">{readyAgentCount}/{totalAgents}</p>
							<p class="text-xs text-muted-foreground">Agents available</p>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="lg:col-span-2 border border-border/60 bg-card/70 shadow-lg backdrop-blur">
					<Card.Header class="pb-3">
						<div class="flex items-start gap-4">
							<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
								<GithubLogo size={18} weight="bold" />
							</div>
							<div class="space-y-1">
								<p class={headerLabelClass}>GitHub</p>
								<h2 class="text-lg font-semibold text-foreground">Connection</h2>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="space-y-3 pt-0">
						<div class="rounded-lg border border-border/60 bg-background/80 p-3">
							<p class="text-xs text-muted-foreground">Signed in as</p>
							<p class="mt-2 text-sm font-medium text-foreground">{github.handle}</p>
						</div>
						<Button size="sm" variant="secondary" href="/api/auth/github">
							Reconnect
						</Button>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<AgentSettingsDialog bind:open={showAgents} bind:agents={agentConfig} />

		<Sheet.Root bind:open={showCredentials}>
			<Sheet.Content side="right" class="sm:max-w-xl">
				<Sheet.Header class="px-6 pt-6">
					<p class={headerLabelClass}>Credentials</p>
				<Sheet.Title>Fly + Provider Keys</Sheet.Title>
					<Sheet.Description>
						Stored in your private GitHub Gist and used for cloud execution.
					</Sheet.Description>
				</Sheet.Header>
				<div class="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
					<div class="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3">
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fly</p>
					<div class="space-y-3">
						<div class="space-y-2">
							<p class="text-sm font-medium text-foreground">Fly API Token</p>
							<div class="flex flex-wrap gap-2">
								<Input
									value={fly?.flyToken ?? ''}
									type={revealCredential.flyToken ? 'text' : 'password'}
									placeholder="fly_..."
									class="min-w-[220px] flex-1"
									oninput={(event) => updateFlyToken((event.target as HTMLInputElement).value)}
								/>
								<Button variant="secondary" size="sm" type="button" onclick={() => toggleReveal('flyToken')}>
									{revealCredential.flyToken ? 'Hide' : 'Reveal'}
								</Button>
							</div>
						</div>
						<div class="space-y-2">
							<p class="text-sm font-medium text-foreground">Fly App Name</p>
							<Input
								value={fly?.flyAppName ?? ''}
								type="text"
								placeholder="porter-yourname"
								class="min-w-[220px]"
								oninput={(event) => updateFlyAppName((event.target as HTMLInputElement).value)}
							/>
						</div>
					</div>
					{#if flyStatus}
						<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
							{flyStatus}
						</div>
					{/if}
				</div>
					<div class="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3">
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Provider Keys</p>
						<div class="space-y-3">
							{#each credentialProviders as provider}
								<div class="rounded-lg border border-border/60 bg-background/70 p-3">
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="text-sm font-medium text-foreground">{provider.label} API key</p>
											<p class="mt-1 text-xs text-muted-foreground">{provider.note}</p>
										</div>
										<Badge variant={credentials?.[provider.key] ? 'secondary' : 'outline'} class="text-xs">
											{credentials?.[provider.key] ? 'Stored' : 'Missing'}
										</Badge>
									</div>
									<div class="mt-3 flex flex-wrap gap-2">
										<Input
											value={credentials?.[provider.key] ?? ''}
											type={revealCredential[provider.key] ? 'text' : 'password'}
											placeholder={`Enter ${provider.label} key`}
											class="min-w-[220px] flex-1"
											oninput={(event) =>
												updateCredential(provider.key, (event.target as HTMLInputElement).value)
											}
										/>
										<Button variant="secondary" size="sm" type="button" onclick={() => toggleReveal(provider.key)}>
											{revealCredential[provider.key] ? 'Hide' : 'Reveal'}
										</Button>
										<Button
											variant="outline"
											size="sm"
											type="button"
											onclick={() => rotateCredential(provider.key)}
										>
											Rotate
										</Button>
									</div>
								</div>
							{/each}
						</div>
						{#if credentialStatus}
							<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
								{credentialStatus}
							</div>
						{/if}
					</div>
				</div>
				<Sheet.Footer class="px-6 pb-6">
					<div class="flex flex-wrap justify-end gap-2">
						<Button type="button" variant="outline" onclick={() => validateFly(true)} disabled={flyValidating}>
							{flyValidating ? 'Validating...' : 'Validate Fly'}
						</Button>
					<Button type="button" variant="secondary" onclick={saveFly} disabled={flySaving}>
						{flySaving ? 'Saving...' : 'Save Fly settings'}
					</Button>
						<Button type="button" onclick={saveCredentials} disabled={credentialSaving}>
							{credentialSaving ? 'Saving...' : 'Save Provider Keys'}
						</Button>
					</div>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>

		<Sheet.Root bind:open={showRepos}>
			<Sheet.Content side="right" class="sm:max-w-xl">
				<Sheet.Header class="px-6 pt-6">
					<p class={headerLabelClass}>Repositories</p>
					<Sheet.Title>Repository Scope</Sheet.Title>
					<Sheet.Description>
						Select which repositories Porter should monitor.
					</Sheet.Description>
				</Sheet.Header>
				<div class="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
					<Input placeholder="Search repositories" class="h-10" bind:value={repoSearch} />
					{#if repoLoading}
						<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
							Loading repositories...
						</div>
					{:else if filteredRepos.length === 0}
						<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
							No repositories match that search.
						</div>
					{:else}
						<div class="space-y-2">
							{#each filteredRepos as repo}
								<label class="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs">
									<div>
										<p class="text-sm font-medium text-foreground">{repo.fullName}</p>
										{#if repo.description}
											<p class="text-xs text-muted-foreground">{repo.description}</p>
										{/if}
									</div>
									<input
										class="h-4 w-4 accent-primary"
										type="checkbox"
										checked={selectedRepoIds.includes(repo.id)}
										onchange={() => toggleRepoSelection(repo.id)}
									/>
								</label>
							{/each}
						</div>
					{/if}
					{#if repoStatus}
						<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
							{repoStatus}
						</div>
					{/if}
				</div>
				<Sheet.Footer class="px-6 pb-6">
					<div class="flex justify-end">
						<Button type="button" onclick={saveRepos} disabled={repoSaving}>
							{repoSaving ? 'Saving...' : 'Save Repositories'}
						</Button>
					</div>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	{/if}
</div>
