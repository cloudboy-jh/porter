<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { CheckCircle, GithubLogo, WarningCircle } from 'phosphor-svelte';
	import AgentSettingsDialog from '$lib/components/AgentSettingsDialog.svelte';
	import CredentialsModal from '$lib/components/CredentialsModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { AgentConfig } from '$lib/types/agent';
	import type { PageData } from './$types';

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
		gistUrl?: string;
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
	type GithubSummary = {
		user?: { login: string; avatarUrl?: string | null };
		repositories?: Array<{ id: number }>;
	};
	type EditableField = 'flyToken' | 'flyAppName' | 'anthropic' | 'amp' | 'openai';
	type RepoFilter = 'all' | 'selected' | 'unselected' | 'private' | 'public';

	let { data } = $props<{ data: PageData }>();

	let agentConfig = $state<AgentDisplay[]>([]);
	let credentials = $state<Credentials>({});
	let fly = $state<FlyCredentials>({});
	let repositories = $state<RepoSummary[]>([]);
	let selectedRepoIds = $state<number[]>([]);
	let configSnapshot = $state<ConfigSnapshot | null>(null);
	let gistUrl = $state<string | null>(null);
	let githubSummary = $state<GithubSummary>({});

	let editingField = $state<EditableField | null>(null);
	let draftValue = $state('');

	let credentialStatus = $state('');
	let flyStatus = $state('');
	let repoStatus = $state('');

	let credentialSaving = $state(false);
	let flySaving = $state(false);
	let flyValidating = $state(false);
	let repoSaving = $state(false);
	let repoLoading = $state(false);
	let repoSearch = $state('');
	let repoFilter = $state<RepoFilter>('all');
	let anthropicValidated = $state(false);

	let showAgents = $state(false);
	let showCredentialsModal = $state(false);

	const isConnected = $derived(Boolean(data?.session));
	const githubHandle = $derived(data?.session?.user?.login ? `@${data.session.user.login}` : '');
	const enabledAgents = $derived(agentConfig.filter((agent) => agent.enabled));
	const readyAgents = $derived(
		agentConfig.filter((agent) => (agent.readyState ? agent.readyState === 'ready' : agent.enabled))
	);
	const flyValidationReady = $derived(Boolean(fly.validation?.ok));
	const reposReady = $derived(selectedRepoIds.length > 0);
	const webhookReady = $derived(isConnected && flyValidationReady && readyAgents.length > 0);
	const installedRepoCount = $derived(githubSummary.repositories?.length ?? repositories.length);

	const matchesRepoFilter = (repo: RepoSummary) => {
		switch (repoFilter) {
			case 'selected':
				return selectedRepoIds.includes(repo.id);
			case 'unselected':
				return !selectedRepoIds.includes(repo.id);
			case 'private':
				return repo.private;
			case 'public':
				return !repo.private;
			default:
				return true;
		}
	};

	const filteredRepos = $derived(
		repositories.filter((repo) => {
			const matchesSearch = repoSearch
				? repo.fullName.toLowerCase().includes(repoSearch.toLowerCase())
				: true;
			return matchesSearch && matchesRepoFilter(repo);
		})
	);

	const sectionLabelClass =
		'text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground';

	const getAgentIcon = (agent: AgentDisplay) => {
		const domainMap: Record<string, string> = {
			opencode: 'opencode.ai',
			'claude-code': 'claude.ai',
			amp: 'ampcode.com'
		};
		return `https://www.google.com/s2/favicons?domain=${domainMap[agent.name] ?? 'github.com'}&sz=64`;
	};

	const getFieldValue = (field: EditableField) => {
		switch (field) {
			case 'flyToken':
				return fly.flyToken ?? '';
			case 'flyAppName':
				return fly.flyAppName ?? '';
			case 'anthropic':
				return credentials.anthropic ?? '';
			case 'amp':
				return credentials.amp ?? '';
			case 'openai':
				return credentials.openai ?? '';
		}
	};

	const getFieldLabel = (field: EditableField) => {
		switch (field) {
			case 'flyToken':
				return 'Fly Token';
			case 'flyAppName':
				return 'Fly App Name';
			case 'anthropic':
				return 'Anthropic API Key';
			case 'amp':
				return 'Amp API Key';
			case 'openai':
				return 'OpenAI API Key';
		}
	};

	const getFieldIcon = (field: EditableField) => {
		switch (field) {
			case 'flyToken':
			case 'flyAppName':
				return {
					src: 'https://www.google.com/s2/favicons?domain=fly.io&sz=64',
					alt: 'Fly logo'
				};
			case 'anthropic':
				return {
					src: 'https://www.google.com/s2/favicons?domain=anthropic.com&sz=64',
					alt: 'Anthropic logo'
				};
			case 'amp':
				return {
					src: 'https://www.google.com/s2/favicons?domain=ampcode.com&sz=64',
					alt: 'Amp logo'
				};
			case 'openai':
				return {
					src: 'https://www.google.com/s2/favicons?domain=openai.com&sz=64',
					alt: 'OpenAI logo'
				};
		}
	};

	const isSecretField = (field: EditableField) => field !== 'flyAppName';

	const formatFieldValue = (field: EditableField) => {
		const value = getFieldValue(field).trim();
		if (!value) return 'Not configured';
		if (!isSecretField(field)) return value;
		return '••••••••••';
	};

	const startEditField = (field: EditableField) => {
		editingField = field;
		draftValue = getFieldValue(field);
	};

	const cancelEditField = () => {
		editingField = null;
		draftValue = '';
	};

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
			agentConfig = (await response.json()) as AgentConfig[];
		} catch {
			// ignore
		}
	};

	const loadConfig = async () => {
		try {
			const response = await fetch('/api/config');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) return;
			const payload = (await response.json()) as ConfigSnapshot;
			credentials = payload.credentials ?? {};
			fly = { flyToken: payload.flyToken, flyAppName: payload.flyAppName };
			configSnapshot = payload;
			gistUrl = payload.gistUrl ?? null;
			selectedRepoIds = payload.onboarding?.selectedRepos?.map((repo) => repo.id) ?? [];
			if ((payload.credentials?.anthropic ?? '').trim()) {
				anthropicValidated = false;
			}
			if (payload.flyToken && payload.flyAppName) {
				await validateFly(false);
			}
		} catch {
			// ignore
		}
	};

	const loadGithubSummary = async () => {
		try {
			const response = await fetch('/api/github/summary');
			if (!response.ok) return;
			githubSummary = (await response.json()) as GithubSummary;
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

	const saveCredentials = async (nextCredentials: Credentials) => {
		credentialSaving = true;
		credentialStatus = '';
		try {
			const response = await fetch('/api/config/credentials', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(nextCredentials)
			});
			if (!response.ok) {
				credentialStatus = 'Failed to save credentials.';
				return false;
			}
			credentials = (await response.json()) as Credentials;
			credentialStatus = 'Credentials updated.';
			if ((credentials.anthropic ?? '').trim()) {
				anthropicValidated = false;
			}
			await loadAgents(true);
			return true;
		} catch (error) {
			console.error('Saving credentials failed:', error);
			credentialStatus = 'Failed to save credentials.';
			return false;
		} finally {
			credentialSaving = false;
		}
	};

	const validateFly = async (showMessage = true) => {
		flyValidating = true;
		if (showMessage) flyStatus = '';
		try {
			const response = await fetch('/api/config/validate/fly');
			const payload = (await response.json()) as FlyValidation;
			fly.validation = payload;
			if (showMessage) flyStatus = payload.message;
		} catch (error) {
			console.error('Validating Fly credentials failed:', error);
			fly.validation = {
				ok: false,
				status: 'error',
				message: 'Failed to validate Fly credentials.',
				appCreated: false
			};
			if (showMessage) flyStatus = 'Failed to validate Fly credentials.';
		} finally {
			flyValidating = false;
		}
	};

	const saveFly = async (nextFly: FlyCredentials) => {
		flySaving = true;
		flyStatus = '';
		try {
			const response = await fetch('/api/config/fly', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...nextFly, validate: true })
			});
			if (!response.ok) {
				flyStatus = 'Failed to save Fly settings.';
				return false;
			}
			const payload = (await response.json()) as FlyCredentials;
			fly = {
				flyToken: payload.flyToken,
				flyAppName: payload.flyAppName,
				validation: payload.validation
			};
			flyStatus = payload.validation?.message ?? 'Fly settings updated.';
			return true;
		} catch (error) {
			console.error('Saving Fly settings failed:', error);
			flyStatus = 'Failed to save Fly settings.';
			return false;
		} finally {
			flySaving = false;
		}
	};

	const validateAnthropic = async () => {
		try {
			const response = await fetch('/api/config/validate/anthropic');
			anthropicValidated = response.ok;
		} catch {
			anthropicValidated = false;
		}
	};

	const saveField = async (field: EditableField) => {
		const value = draftValue.trim();
		if (field === 'flyToken' || field === 'flyAppName') {
			const nextFly = { ...fly, [field]: value };
			const ok = await saveFly(nextFly);
			if (ok) cancelEditField();
			return;
		}

		const nextCredentials = { ...credentials, [field]: value };
		const ok = await saveCredentials(nextCredentials);
		if (ok) {
			if (field === 'anthropic') {
				await validateAnthropic();
			}
			cancelEditField();
		}
	};

	const getFieldStatus = (field: EditableField) => {
		const value = getFieldValue(field).trim();
		if (!value) {
			return null;
		}

		if (field === 'flyToken' || field === 'flyAppName') {
			if (fly.validation?.ok) {
				return { ready: true, label: 'Validated' };
			}
			return { ready: false, label: 'Not tested' };
		}

		if (field === 'anthropic') {
			if (anthropicValidated) {
				return { ready: true, label: 'Validated' };
			}
			return { ready: false, label: 'Not tested' };
		}

		return { ready: false, label: 'Not tested' };
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
			if (!response.ok) {
				repoStatus = 'Failed to save repositories.';
				return;
			}
			configSnapshot = (await response.json()) as ConfigSnapshot;
			repoStatus = 'Repositories updated.';
		} catch (error) {
			console.error('Saving repositories failed:', error);
			repoStatus = 'Failed to save repositories.';
		} finally {
			repoSaving = false;
		}
	};

	const handleDisconnect = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch (error) {
			console.error('Disconnect failed:', error);
		}
		await goto('/auth');
	};

	onMount(() => {
		loadAgents(true);
		if (isConnected) {
			loadConfig();
			loadRepositories();
			loadGithubSummary();
		}
	});
</script>

<main class="flex-1 overflow-y-auto">
	<div class="mx-auto w-full max-w-[1600px] px-6 pt-8 pb-16">
		{#if !isConnected}
			<EmptyState
				icon={GithubLogo}
				title="Connect GitHub to unlock settings"
				description="Authorize Porter to configure credentials, repos, and runtime defaults."
				actionLabel="Connect GitHub"
				actionHref="/api/auth/github"
				variant="hero"
			/>
		{:else}
			<div class="space-y-8">
				<h1 class="text-2xl font-semibold text-foreground">Settings</h1>

				<div class="grid gap-12 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
					<div class="space-y-12">
						<section id="credentials" class="space-y-4 border-b border-border/20 pb-10">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class={sectionLabelClass}>Credentials</p>
									<p class="mt-1 text-sm text-muted-foreground">API keys and tokens stored in your private GitHub Gist.</p>
								</div>
								<Button size="sm" onclick={() => (showCredentialsModal = true)}>Manage Credentials</Button>
							</div>

							<div class="divide-y divide-border/30 rounded-xl border border-border/50 bg-card/30">
								{#each ['flyToken', 'flyAppName', 'anthropic', 'amp', 'openai'] as field}
									{@const fieldStatus = getFieldStatus(field as EditableField)}
									<div class="space-y-2 px-4 py-3">
										<div class="flex flex-wrap items-center gap-3">
											<div class="min-w-[180px]">
												<div class="flex items-center gap-2 text-sm font-medium text-foreground">
													<img src={getFieldIcon(field as EditableField).src} alt={getFieldIcon(field as EditableField).alt} class="h-4 w-4 rounded-sm" />
													<span>{getFieldLabel(field as EditableField)}</span>
												</div>
											</div>
											<div class="min-w-0 flex-1">
												{#if editingField === field}
													<Input
														value={draftValue}
														type={isSecretField(field as EditableField) ? 'password' : 'text'}
														oninput={(event) => (draftValue = (event.target as HTMLInputElement).value)}
													/>
												{:else}
													{#if getFieldValue(field as EditableField).trim()}
														<p class="text-sm text-muted-foreground">{formatFieldValue(field as EditableField)}</p>
													{:else}
														<div class="flex items-center gap-2 text-sm text-muted-foreground" title="Not configured">
															<span class="h-2 w-2 rounded-full bg-amber-500"></span>
															<span>Not configured</span>
														</div>
													{/if}
												{/if}
											</div>
											<div class="flex items-center gap-2">
												{#if editingField === field}
													<Button size="sm" onclick={() => saveField(field as EditableField)} disabled={credentialSaving || flySaving}>
														Save
													</Button>
													<Button variant="ghost" size="sm" onclick={cancelEditField}>Cancel</Button>
												{:else}
													<Button variant="outline" size="sm" onclick={() => startEditField(field as EditableField)}>
														{getFieldValue(field as EditableField).trim() ? 'Edit' : 'Add'}
													</Button>
												{/if}
											</div>
										</div>
										{#if fieldStatus}
											<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
												{#if fieldStatus.ready}
													<CheckCircle size={14} weight="fill" class="text-emerald-500" />
												{:else}
													<WarningCircle size={14} weight="fill" class="text-amber-500" />
												{/if}
												<span>{fieldStatus.label}</span>
											</div>
										{/if}
									</div>
								{/each}
							</div>

							<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
								{#if gistUrl}
									<a href={gistUrl} target="_blank" rel="noreferrer" class="font-medium text-primary hover:text-primary/80">
										View Gist ↗
									</a>
								{:else}
									<span>Gist unavailable (reconnect GitHub to grant gist access)</span>
								{/if}
								<span>Need another provider? Use Manage Credentials.</span>
								{#if credentialStatus}<span>{credentialStatus}</span>{/if}
								{#if flyStatus}<span>{flyStatus}</span>{/if}
								{#if flyValidating}<span>Validating Fly...</span>{/if}
							</div>
						</section>

						<section class="space-y-4">
							<div>
								<p class={sectionLabelClass}>Repositories</p>
								<p class="mt-1 text-sm text-muted-foreground">Select which repos Porter can operate on.</p>
							</div>

							<Input placeholder="Search repositories" bind:value={repoSearch} class="h-10" />

							<div class="flex flex-wrap gap-2">
								{#each [
									{ key: 'all', label: 'All' },
									{ key: 'selected', label: 'Selected' },
									{ key: 'unselected', label: 'Unselected' },
									{ key: 'private', label: 'Private' },
									{ key: 'public', label: 'Public' }
								] as Array<{ key: RepoFilter; label: string }> as filter}
									<Button
										variant={repoFilter === filter.key ? 'secondary' : 'outline'}
										size="sm"
										onclick={() => (repoFilter = filter.key)}
									>
										{filter.label}
									</Button>
								{/each}
							</div>

							<div class="custom-scrollbar max-h-[350px] space-y-2 overflow-y-auto pr-1">
								{#if repoLoading}
									<div class="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Loading repositories...</div>
								{:else if filteredRepos.length === 0}
									<div class="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">No repositories match that search.</div>
								{:else}
									{#each filteredRepos as repo}
										<label class={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition ${selectedRepoIds.includes(repo.id) ? 'border-primary/35 bg-primary/10' : 'border-border/60 bg-background/70 hover:border-border'}`}>
											<div>
												<p class="text-sm font-medium text-foreground">{repo.fullName}</p>
												{#if repo.description}
													<p class="mt-0.5 text-xs text-muted-foreground">{repo.description}</p>
												{/if}
											</div>
											<input
												type="checkbox"
												class="mt-1 h-4 w-4 accent-primary"
												checked={selectedRepoIds.includes(repo.id)}
												onchange={() => toggleRepoSelection(repo.id)}
											/>
										</label>
									{/each}
								{/if}
							</div>

							<div class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
								<span>{selectedRepoIds.length} of {repositories.length} selected</span>
								{#if repoStatus}<span>{repoStatus}</span>{/if}
								<Button size="sm" onclick={saveRepos} disabled={repoSaving}>{repoSaving ? 'Saving...' : 'Save Repositories'}</Button>
							</div>
						</section>
					</div>

					<div class="space-y-10">
						<section class="space-y-3 border-b border-border/20 pb-8">
							<p class={sectionLabelClass}>Status</p>
							<div class="space-y-2">
								<div class="flex items-center justify-between text-sm">
									<span class="flex items-center gap-2">
										{#if isConnected}<CheckCircle size={16} weight="fill" class="text-emerald-500" />{:else}<WarningCircle size={16} weight="fill" class="text-amber-500" />{/if}
										GitHub
									</span>
									<span class="text-muted-foreground">{isConnected ? 'Connected' : 'Missing auth'}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="flex items-center gap-2">
										{#if flyValidationReady}<CheckCircle size={16} weight="fill" class="text-emerald-500" />{:else}<WarningCircle size={16} weight="fill" class="text-amber-500" />{/if}
										Fly
									</span>
									<span class="text-muted-foreground">{flyValidationReady ? 'Connected' : 'Missing token/app'}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="flex items-center gap-2">
										{#if (credentials.anthropic ?? '').trim()}<CheckCircle size={16} weight="fill" class="text-emerald-500" />{:else}<WarningCircle size={16} weight="fill" class="text-amber-500" />{/if}
										LLM Keys
									</span>
									<span class="text-muted-foreground">{(credentials.anthropic ?? '').trim() ? 'Anthropic configured' : 'Missing Anthropic key'}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="flex items-center gap-2">
										{#if reposReady}<CheckCircle size={16} weight="fill" class="text-emerald-500" />{:else}<WarningCircle size={16} weight="fill" class="text-amber-500" />{/if}
										Repositories
									</span>
									<span class="text-muted-foreground">{selectedRepoIds.length} selected</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="flex items-center gap-2">
										{#if webhookReady}<CheckCircle size={16} weight="fill" class="text-emerald-500" />{:else}<WarningCircle size={16} weight="fill" class="text-amber-500" />{/if}
										Webhook
									</span>
									<span class="text-muted-foreground">{webhookReady ? 'Active' : 'Blocked'}</span>
								</div>
							</div>
						</section>

						<section class="space-y-3 border-b border-border/20 pb-8">
							<p class={sectionLabelClass}>GitHub</p>
							<div class="flex items-center gap-3">
								{#if githubSummary.user?.avatarUrl}
									<img src={githubSummary.user.avatarUrl} alt="GitHub avatar" class="h-9 w-9 rounded-full border border-border/60" />
								{:else}
									<div class="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/60">
										<GithubLogo size={16} weight="bold" class="text-muted-foreground" />
									</div>
								{/if}
								<div>
									<p class="text-sm font-medium text-foreground">Signed in as {githubHandle}</p>
									<p class="text-xs text-muted-foreground">App installed on {installedRepoCount} repositories</p>
								</div>
							</div>
							<div class="flex flex-wrap gap-2">
								<Button variant="secondary" href="/api/auth/github">Reconnect</Button>
								<Button variant="outline" class="text-destructive hover:text-destructive" onclick={handleDisconnect}>Disconnect</Button>
							</div>
						</section>

						<section class="space-y-3">
							<p class={sectionLabelClass}>Agents</p>
							<p class="text-sm text-foreground">{enabledAgents.length} of {agentConfig.length} agents enabled</p>
							<div class="space-y-2">
								{#each agentConfig as agent}
									<div class="flex items-center justify-between text-sm">
										<span class="flex items-center gap-2">
											<img src={getAgentIcon(agent)} alt={agent.name} class="h-4 w-4 rounded-sm" />
											{agent.displayName ?? agent.name}
										</span>
										<span class={`h-2 w-2 rounded-full ${agent.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}></span>
									</div>
								{/each}
							</div>
							<Button class="w-full" onclick={() => (showAgents = true)}>Configure Agents</Button>
						</section>
					</div>
				</div>
			</div>

			<AgentSettingsDialog bind:open={showAgents} bind:agents={agentConfig} />
			<CredentialsModal bind:open={showCredentialsModal} onsaved={loadConfig} />
		{/if}
	</div>
</main>
