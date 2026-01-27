<script lang="ts">
	import { onMount } from 'svelte';
	import { GithubLogo, ShieldCheck, Stack, Robot, Sparkle } from 'phosphor-svelte';
	import { env as publicEnv } from '$env/dynamic/public';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import AgentSettings from '$lib/components/AgentSettings.svelte';
	import type { PageData } from './$types';
	import type { AgentConfig } from '$lib/types/agent';
	import logo from '../../logos/porter-logo-main.png';

	type Credentials = { anthropic?: string; openai?: string; amp?: string };
	type ModalCredentials = { tokenId?: string; tokenSecret?: string };
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
		modal?: ModalCredentials;
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
	const isConnected = $derived(Boolean(data?.session));
	const githubHandle = $derived(data?.session?.user?.login ? `@${data.session.user.login}` : 'Not connected');
	let repositories = $state<RepoSummary[]>([]);
	let hasInstallation = $state(false);
	let credentials = $state<Credentials>({});
	let modal = $state<ModalCredentials>({});
	let selectedRepoIds = $state<number[]>([]);
	let agentConfig = $state<AgentConfig[]>([]);
	let configSnapshot = $state<ConfigSnapshot | null>(null);
	let statusMessage = $state('');
	let isSaving = $state(false);
	let revealField = $state<Record<string, boolean>>({});

	const modalReady = $derived(Boolean(modal?.tokenId?.trim()) && Boolean(modal?.tokenSecret?.trim()));
	const anthropicReady = $derived(Boolean(credentials?.anthropic?.trim()));
	const reposReady = $derived(selectedRepoIds.length > 0);
	const agentsReady = $derived(agentConfig.some((agent) => agent.enabled));
	const runtimeReady = $derived(isConnected && hasInstallation && reposReady && modalReady && anthropicReady && agentsReady);

	const headerLabelClass =
		'text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground';
	const installUrl = publicEnv.PUBLIC_GITHUB_APP_INSTALL_URL ?? 'https://github.com/apps/porter/installations/new';

	const loadState = async () => {
		if (!isConnected) return;
		try {
			const [reposRes, configRes, agentsRes] = await Promise.all([
				fetch('/api/github/repositories'),
				fetch('/api/config'),
				fetch('/api/agents')
			]);
			if (reposRes.status === 401 || configRes.status === 401 || agentsRes.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (reposRes.ok) {
				const payload = (await reposRes.json()) as { repositories: RepoSummary[]; hasInstallation?: boolean };
				repositories = payload.repositories ?? [];
				hasInstallation = Boolean(payload.hasInstallation);
				if (!selectedRepoIds.length && repositories.length) {
					selectedRepoIds = repositories.map((repo) => repo.id);
				}
			}
			if (configRes.ok) {
				const config = (await configRes.json()) as ConfigSnapshot;
				configSnapshot = config;
				credentials = config.credentials ?? {};
				modal = config.modal ?? {};
				selectedRepoIds = config.onboarding?.selectedRepos?.map((repo) => repo.id) ?? selectedRepoIds;
			}
			if (agentsRes.ok) {
				agentConfig = (await agentsRes.json()) as AgentConfig[];
			}
		} catch (error) {
			console.error('Failed to load onboarding state:', error);
		}
	};

	onMount(() => {
		loadState();
	});

	const toggleReveal = (key: string) => {
		revealField = { ...revealField, [key]: !revealField[key] };
	};

	const updateCredential = (key: keyof Credentials, value: string) => {
		credentials = { ...credentials, [key]: value };
	};

	const updateModalField = (key: keyof ModalCredentials, value: string) => {
		modal = { ...modal, [key]: value };
	};

	const saveCredentials = async () => {
		isSaving = true;
		statusMessage = '';
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
				statusMessage = 'Failed to save credentials.';
				return;
			}
			statusMessage = 'Credentials saved.';
		} catch (error) {
			console.error('Saving credentials failed:', error);
			statusMessage = 'Failed to save credentials.';
		} finally {
			isSaving = false;
		}
	};

	const saveModal = async () => {
		isSaving = true;
		statusMessage = '';
		try {
			const response = await fetch('/api/config/modal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(modal)
			});
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				statusMessage = 'Failed to save Modal credentials.';
				return;
			}
			statusMessage = 'Modal credentials saved.';
		} catch (error) {
			console.error('Saving Modal credentials failed:', error);
			statusMessage = 'Failed to save Modal credentials.';
		} finally {
			isSaving = false;
		}
	};

	const toggleRepoSelection = (id: number) => {
		selectedRepoIds = selectedRepoIds.includes(id)
			? selectedRepoIds.filter((repoId) => repoId !== id)
			: [...selectedRepoIds, id];
	};

	const saveRepos = async () => {
		if (!configSnapshot) return;
		isSaving = true;
		statusMessage = '';
		try {
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
				statusMessage = 'Failed to save repositories.';
				return;
			}
			statusMessage = 'Repositories saved.';
		} catch (error) {
			console.error('Saving repositories failed:', error);
			statusMessage = 'Failed to save repositories.';
		} finally {
			isSaving = false;
		}
	};

	const handleAgentSave = async (config: AgentConfig[]) => {
		agentConfig = config;
		try {
			const response = await fetch('/api/agents', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config)
			});
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				statusMessage = 'Failed to save agents.';
				return;
			}
			statusMessage = 'Agents updated.';
		} catch (error) {
			console.error('Saving agent config failed:', error);
			statusMessage = 'Failed to save agents.';
		}
	};
</script>

<div class="flex min-h-[70vh] items-center justify-center">
	<div class="w-full max-w-4xl space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<img src={logo} alt="Porter" class="h-10 w-10 rounded-xl border border-border/60 bg-background/70 p-1" />
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Porter</p>
					<p class="text-sm font-medium text-foreground">Cloud onboarding</p>
				</div>
			</div>
			<div class="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
				<Sparkle size={14} weight="bold" class="text-primary" />
				Cloud-native setup, no local agents
			</div>
		</div>

		<section class="space-y-4">
			<Card.Root class="border border-border/60 bg-card/70 shadow-[0_20px_40px_-28px_rgba(15,15,15,0.5)]">
				<Card.Content class="grid gap-6 p-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
					<div class="space-y-4">
						<p class={headerLabelClass}>Step 01</p>
						<h1 class="text-2xl font-semibold text-foreground">Connect your GitHub workspace</h1>
						<p class="text-sm text-muted-foreground">
							Authorize Porter to read issues and create PRs. This is the only way to run cloud tasks.
						</p>
						<div class="flex flex-wrap items-center gap-3">
							<Button size="lg" class="gap-2" href="/api/auth/github">
								<GithubLogo size={18} weight="bold" />
								{isConnected ? 'Reconnect GitHub' : 'Continue with GitHub'}
							</Button>
							<Badge variant={isConnected ? 'secondary' : 'outline'} class="text-xs">
								{isConnected ? `Connected · ${githubHandle}` : 'Not connected'}
							</Badge>
						</div>
					</div>
					<div class="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-6">
						<div class="flex items-center gap-3 text-sm font-medium">
							<span class="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/70">
								<ShieldCheck size={18} weight="bold" class="text-muted-foreground" />
							</span>
							Permissions summary
						</div>
						<ul class="space-y-3 text-xs text-muted-foreground">
							<li>Reads repository metadata and issue details</li>
							<li>Creates branches, commits, and pull requests</li>
							<li>Uses GitHub App webhooks for dispatch</li>
							<li>Runs entirely in the cloud</li>
						</ul>
					</div>
				</Card.Content>
			</Card.Root>
		</section>

		<section class="space-y-4">
			<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-start gap-4">
							<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
								<GithubLogo size={18} weight="bold" />
							</div>
							<div class="space-y-1">
								<p class={headerLabelClass}>Step 02</p>
								<h2 class="text-lg font-semibold text-foreground">Install the Porter GitHub App</h2>
								<p class="text-xs text-muted-foreground">
									The GitHub App provides webhooks and repo access.
								</p>
							</div>
						</div>
						<Badge variant={hasInstallation ? 'secondary' : 'outline'} class="text-xs">
							{hasInstallation ? 'Installed' : 'Not installed'}
						</Badge>
					</div>
				</Card.Header>
				<Card.Content class="flex flex-wrap items-center justify-between gap-3 pt-0">
					<p class="text-sm text-muted-foreground">
						Connect the app to the repositories you want Porter to watch.
					</p>
					<Button variant={hasInstallation ? 'secondary' : 'default'} href={installUrl}>
						{hasInstallation ? 'Manage installation' : 'Install GitHub App'}
					</Button>
				</Card.Content>
			</Card.Root>
		</section>

		<section class="space-y-4">
			<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
				<Card.Header class="pb-3">
					<div class="flex items-start gap-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
							<Stack size={18} weight="bold" />
						</div>
						<div class="space-y-1">
							<p class={headerLabelClass}>Step 03</p>
							<h2 class="text-lg font-semibold text-foreground">Select repositories</h2>
							<p class="text-xs text-muted-foreground">
								Choose which repositories Porter will monitor.
							</p>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-3 pt-0">
					{#if repositories.length === 0}
						<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
							No repositories found. Install the app to continue.
						</div>
					{:else}
						<div class="space-y-2">
							{#each repositories as repo}
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
				</Card.Content>
				<Card.Footer class="flex items-center justify-end">
					<Button type="button" onclick={saveRepos} disabled={!isConnected || isSaving}>
						Save repositories
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>

		<section class="space-y-4">
			<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
				<Card.Header class="pb-3">
					<div class="flex items-start gap-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
							<Stack size={18} weight="bold" />
						</div>
						<div class="space-y-1">
							<p class={headerLabelClass}>Step 04</p>
							<h2 class="text-lg font-semibold text-foreground">Add Modal + LLM keys</h2>
							<p class="text-xs text-muted-foreground">
								Porter stores these in your private GitHub Gist.
							</p>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-4 pt-0">
					<div class="rounded-lg border border-border/60 bg-background/80 p-4 space-y-3">
						<p class="text-sm font-medium text-foreground">Modal Token ID</p>
						<div class="flex flex-wrap gap-2">
							<Input
								value={modal?.tokenId ?? ''}
								type={revealField.modalTokenId ? 'text' : 'password'}
								placeholder="modal_..."
								class="min-w-[220px] flex-1"
								oninput={(event) => updateModalField('tokenId', (event.target as HTMLInputElement).value)}
							/>
							<Button variant="secondary" size="sm" type="button" onclick={() => toggleReveal('modalTokenId')}>
								{revealField.modalTokenId ? 'Hide' : 'Reveal'}
							</Button>
						</div>
					</div>
					<div class="rounded-lg border border-border/60 bg-background/80 p-4 space-y-3">
						<p class="text-sm font-medium text-foreground">Modal Token Secret</p>
						<div class="flex flex-wrap gap-2">
							<Input
								value={modal?.tokenSecret ?? ''}
								type={revealField.modalTokenSecret ? 'text' : 'password'}
								placeholder="secret_..."
								class="min-w-[220px] flex-1"
								oninput={(event) => updateModalField('tokenSecret', (event.target as HTMLInputElement).value)}
							/>
							<Button variant="secondary" size="sm" type="button" onclick={() => toggleReveal('modalTokenSecret')}>
								{revealField.modalTokenSecret ? 'Hide' : 'Reveal'}
							</Button>
						</div>
					</div>
					<div class="rounded-lg border border-border/60 bg-background/80 p-4 space-y-3">
						<p class="text-sm font-medium text-foreground">Anthropic API Key</p>
						<div class="flex flex-wrap gap-2">
							<Input
								value={credentials?.anthropic ?? ''}
								type={revealField.anthropic ? 'text' : 'password'}
								placeholder="sk-ant-..."
								class="min-w-[220px] flex-1"
								oninput={(event) => updateCredential('anthropic', (event.target as HTMLInputElement).value)}
							/>
							<Button variant="secondary" size="sm" type="button" onclick={() => toggleReveal('anthropic')}>
								{revealField.anthropic ? 'Hide' : 'Reveal'}
							</Button>
						</div>
					</div>
					{#if statusMessage}
						<div class="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
							{statusMessage}
						</div>
					{/if}
				</Card.Content>
				<Card.Footer class="flex flex-wrap justify-end gap-2">
					<Button variant="secondary" type="button" onclick={saveModal} disabled={isSaving}>
						Save Modal
					</Button>
					<Button type="button" onclick={saveCredentials} disabled={isSaving}>
						Save LLM keys
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>

		<section class="space-y-4">
			<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
				<Card.Header class="pb-3">
					<div class="flex items-start gap-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-foreground">
							<Robot size={18} weight="bold" />
						</div>
						<div class="space-y-1">
							<p class={headerLabelClass}>Step 05</p>
							<h2 class="text-lg font-semibold text-foreground">Enable agents</h2>
							<p class="text-xs text-muted-foreground">
								Choose which agents Porter can run in the cloud.
							</p>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="pt-0">
					<AgentSettings
						bind:agents={agentConfig}
						mode="quick"
						framed={false}
						onsave={handleAgentSave}
					/>
				</Card.Content>
			</Card.Root>
		</section>

		<section class="space-y-4">
			<Card.Root class="border border-border/60 bg-card/70 shadow-lg backdrop-blur">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between gap-4">
						<div class="space-y-1">
							<p class={headerLabelClass}>Finish</p>
							<h2 class="text-lg font-semibold text-foreground">Ready to run</h2>
							<p class="text-xs text-muted-foreground">All steps complete when every signal is green.</p>
						</div>
						<Badge variant={runtimeReady ? 'secondary' : 'outline'} class="text-xs">
							{runtimeReady ? 'Ready' : 'Incomplete'}
						</Badge>
					</div>
				</Card.Header>
				<Card.Content class="grid gap-3 pt-0 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-lg border border-border/60 bg-background/80 p-3">
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">GitHub</p>
						<p class="mt-2 text-sm font-medium">{isConnected ? 'Connected' : 'Missing'}</p>
					</div>
					<div class="rounded-lg border border-border/60 bg-background/80 p-3">
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Repos</p>
						<p class="mt-2 text-sm font-medium">{reposReady ? 'Selected' : 'Missing'}</p>
					</div>
					<div class="rounded-lg border border-border/60 bg-background/80 p-3">
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Modal</p>
						<p class="mt-2 text-sm font-medium">{modalReady ? 'Ready' : 'Missing'}</p>
					</div>
					<div class="rounded-lg border border-border/60 bg-background/80 p-3">
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Agents</p>
						<p class="mt-2 text-sm font-medium">{agentsReady ? 'Enabled' : 'Missing'}</p>
					</div>
				</Card.Content>
				<Card.Footer class="flex items-center justify-end">
					<Button href="/" disabled={!runtimeReady}>
						Go to dashboard
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>
	</div>
</div>
