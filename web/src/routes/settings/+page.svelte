<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Check, CheckCircle, Copy, GithubLogo, WarningCircle } from 'phosphor-svelte';
	import AgentSettingsDialog from '$lib/components/AgentSettingsDialog.svelte';
	import CredentialsModal from '$lib/components/CredentialsModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { AgentConfig } from '$lib/types/agent';
	import type { PageData } from './$types';

	type AgentDisplay = AgentConfig & { readyState?: 'ready' | 'missing_credentials' | 'disabled' };
	type Credentials = { anthropic?: string; openai?: string; amp?: string };
	type FlySetupMode = 'org' | 'deploy';
	type FlyValidation = {
		ok: boolean;
		status:
			| 'ready'
			| 'missing'
			| 'missing_token'
			| 'missing_app_name'
			| 'invalid_token'
			| 'insufficient_scope'
			| 'app_not_found'
			| 'name_conflict'
			| 'error';
		message: string;
		appCreated: boolean;
		flyAppName?: string;
		mode?: FlySetupMode;
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
		secretStatus?: {
			providerCredentials?: Record<string, Record<string, 'configured' | 'not_configured'>>;
			legacy?: Record<string, 'configured' | 'not_configured'>;
			flyToken?: 'configured' | 'not_configured';
			flyAppName?: 'configured' | 'not_configured';
		};
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
		warnings?: string[];
	};
	type EditableField = 'flyToken' | 'flyAppName' | 'anthropic' | 'amp' | 'openai';
	type RepoFilter = 'all' | 'selected' | 'unselected' | 'private' | 'public';
	type AuthDiagnostics = {
		ok: boolean;
		installationStatus: 'installed' | 'not_installed' | 'indeterminate';
		action: 'ok' | 'install_app' | 'check_runtime';
		webhookDeliveryStatus?: 'configured' | 'needs_install' | 'indeterminate';
		reason?: string | null;
	};

	let { data } = $props<{ data: PageData }>();

	let agentConfig = $state<AgentDisplay[]>([]);
	let credentials = $state<Credentials>({});
	let fly = $state<FlyCredentials>({});
	let repositories = $state<RepoSummary[]>([]);
	let selectedRepoIds = $state<number[]>([]);
	let configSnapshot = $state<ConfigSnapshot | null>(null);
	let secretStatus = $state<NonNullable<ConfigSnapshot['secretStatus']>>({
		providerCredentials: {},
		legacy: {},
		flyToken: 'not_configured',
		flyAppName: 'not_configured'
	});
	let githubSummary = $state<GithubSummary>({});
	let authDiagnostics = $state<AuthDiagnostics | null>(null);

	let editingField = $state<EditableField | null>(null);
	let draftValue = $state('');

	let credentialStatus = $state('');
	let flyStatus = $state('');
	let repoStatus = $state('');
	let githubStatus = $state('');
	let flySetupMode = $state<FlySetupMode>('org');
	let setupExpanded = $state(false);
	let showFlyAdvanced = $state(false);
	let flyCliCopied = $state(false);

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
	const webhookDeliveryReady = $derived(authDiagnostics?.webhookDeliveryStatus === 'configured');
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

	const flyCliCommand = `fly auth login\nfly tokens create org --name "porter" --expiry 30d`;

	const normalizeSetupMode = (_value: string | null): FlySetupMode => 'org';

	const flyAppNameRequired = (status?: FlyValidation['status']) =>
		status === 'missing_app_name' || status === 'app_not_found';

	const copyFlyCli = async () => {
		try {
			await navigator.clipboard.writeText(flyCliCommand);
			flyCliCopied = true;
			setTimeout(() => {
				flyCliCopied = false;
			}, 1200);
		} catch {
			flyCliCopied = false;
		}
	};

	const logSettingsError = (
		source: string,
		details: {
			status?: number;
			error?: unknown;
			message?: string;
			payload?: unknown;
		}
	) => {
		console.error(`[settings] ${source}`, {
			status: details.status,
			message: details.message,
			error: details.error,
			payload: details.payload
		});
	};

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

	const isFieldConfigured = (field: EditableField) => {
		switch (field) {
			case 'flyToken':
				return secretStatus.flyToken === 'configured';
			case 'flyAppName':
				return secretStatus.flyAppName === 'configured';
			case 'anthropic':
				return secretStatus.legacy?.anthropic === 'configured';
			case 'openai':
				return secretStatus.legacy?.openai === 'configured';
			case 'amp':
				return secretStatus.legacy?.amp === 'configured';
		}
	};

	const getFieldLabel = (field: EditableField) => {
		switch (field) {
			case 'flyToken':
				return 'Fly Org Token';
			case 'flyAppName':
				return 'Fly App Name (optional)';
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
		if (!isFieldConfigured(field)) return 'Not configured';
		if (!isSecretField(field)) return getFieldValue(field).trim();
		return '••••••••••';
	};

	const startEditField = (field: EditableField) => {
		if (field === 'flyAppName') {
			showFlyAdvanced = true;
		}
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
			if (!response.ok) {
				logSettingsError('loadAgents', {
					status: response.status,
					message: 'Agent scan request failed.'
				});
				return;
			}
			agentConfig = (await response.json()) as AgentConfig[];
		} catch (error) {
			logSettingsError('loadAgents', {
				error,
				message: 'Agent scan request threw.'
			});
		}
	};

	const loadConfig = async () => {
		try {
			const response = await fetch('/api/config');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				logSettingsError('loadConfig', {
					status: response.status,
					message: 'Config request failed.'
				});
				return;
			}
			const payload = (await response.json()) as ConfigSnapshot;
			credentials = {};
			fly = { flyToken: '', flyAppName: payload.flyAppName };
			configSnapshot = payload;
			secretStatus = payload.secretStatus ?? {
				providerCredentials: {},
				legacy: {},
				flyToken: 'not_configured',
				flyAppName: 'not_configured'
			};
			selectedRepoIds = payload.onboarding?.selectedRepos?.map((repo) => repo.id) ?? [];
			if (secretStatus.legacy?.anthropic === 'configured') {
				anthropicValidated = false;
			}
			if (secretStatus.flyToken === 'configured' && (payload.flyAppName ?? '').trim()) {
				await validateFly(false);
			}
		} catch (error) {
			logSettingsError('loadConfig', {
				error,
				message: 'Config request threw.'
			});
		}
	};

	const loadGithubSummary = async () => {
		githubStatus = '';
		try {
			const response = await fetch('/api/github/summary');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			const payload = (await response.json().catch(() => ({}))) as GithubSummary & {
				message?: string;
				action?: string;
				actionUrl?: string;
			};
			if (!response.ok) {
				githubStatus =
					payload.message ??
					(payload.action === 'reconnect'
						? 'GitHub account summary requires reconnect. Use Reconnect to refresh permissions.'
						: 'Failed to load GitHub account summary.');
				logSettingsError('loadGithubSummary', {
					status: response.status,
					message: githubStatus,
					payload
				});
				return;
			}
			githubSummary = payload;
			if (payload.warnings?.length) {
				githubStatus = payload.warnings[0] ?? '';
			}
		} catch (error) {
			githubStatus = 'Failed to load GitHub account summary.';
			logSettingsError('loadGithubSummary', {
				error,
				message: githubStatus
			});
		}
	};

	const loadAuthDiagnostics = async () => {
		try {
			const response = await fetch('/api/auth/diagnostics');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				authDiagnostics = null;
				return;
			}
			authDiagnostics = (await response.json()) as AuthDiagnostics;
		} catch {
			authDiagnostics = null;
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
			const payload = (await response.json().catch(() => ({}))) as {
				repositories?: RepoSummary[];
				message?: string;
				action?: string;
			};
			if (!response.ok) {
				repoStatus =
					payload.message ??
					(payload.action === 'reconnect'
						? 'Repositories require reconnect. Use Reconnect to refresh permissions.'
						: 'Failed to load repositories.');
				logSettingsError('loadRepositories', {
					status: response.status,
					message: repoStatus,
					payload
				});
				repositories = [];
				return;
			}
			repositories = payload.repositories ?? [];
			if (!selectedRepoIds.length && repositories.length) {
				selectedRepoIds = repositories.map((repo) => repo.id);
			}
		} catch (error) {
			logSettingsError('loadRepositories', {
				error,
				message: 'Repositories request threw.'
			});
			repoStatus = 'Failed to load repositories.';
			repositories = [];
		} finally {
			repoLoading = false;
		}
	};

	const saveCredentials = async (
		nextCredentials: Credentials,
		successMessage = 'Credentials updated.'
	) => {
		credentialSaving = true;
		credentialStatus = '';
		try {
			const response = await fetch('/api/config/credentials', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(nextCredentials)
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as { message?: string };
				logSettingsError('saveCredentials', {
					status: response.status,
					message: payload.message ?? 'Saving credentials failed.',
					payload
				});
				credentialStatus = payload.message ?? 'Failed to save credentials.';
				return false;
			}
			const payload = (await response.json()) as {
				ok?: boolean;
				secretStatus?: ConfigSnapshot['secretStatus'];
			};
			secretStatus = payload.secretStatus ?? secretStatus;
			credentialStatus = successMessage;
			if (secretStatus.legacy?.anthropic === 'configured') {
				anthropicValidated = false;
			}
			credentials = {};
			await loadAgents(true);
			return true;
		} catch (error) {
			logSettingsError('saveCredentials', {
				error,
				message: 'Saving credentials threw.'
			});
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
			const response = await fetch(`/api/config/validate/fly?mode=${flySetupMode}`);
			const payload = (await response.json()) as FlyValidation;
			fly = {
				...fly,
				flyAppName: payload.flyAppName ?? fly.flyAppName,
				validation: payload
			};
			if (flyAppNameRequired(payload.status)) {
				showFlyAdvanced = true;
			}
			if (showMessage) flyStatus = payload.message;
			if (!response.ok) {
				logSettingsError('validateFly', {
					status: response.status,
					message: payload.message,
					payload
				});
			}
		} catch (error) {
			logSettingsError('validateFly', {
				error,
				message: 'Validating Fly credentials threw.'
			});
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

	const saveFly = async (nextFly: FlyCredentials, successPrefix = 'Fly settings saved.') => {
		flySaving = true;
		flyStatus = '';
		try {
			const response = await fetch('/api/config/fly', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...nextFly, validate: true, setupMode: flySetupMode })
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as { message?: string };
				flyStatus = payload.message ?? 'Failed to save Fly settings.';
				logSettingsError('saveFly', {
					status: response.status,
					message: flyStatus,
					payload
				});
				return false;
			}
			const payload = (await response.json()) as FlyCredentials & { setupMode?: FlySetupMode };
			if (!payload.validation?.ok) {
				fly = {
					...fly,
					flyAppName: payload.flyAppName,
					validation: payload.validation
				};
				if (flyAppNameRequired(payload.validation?.status)) {
					showFlyAdvanced = true;
				}
				flyStatus = payload.validation?.message ?? 'Failed to validate Fly settings.';
				return false;
			}
			fly = {
				flyToken: payload.flyToken,
				flyAppName: payload.flyAppName,
				validation: payload.validation
			};
			if (payload.setupMode) {
				flySetupMode = payload.setupMode;
			}
			const detail = payload.validation?.message ?? 'Fly settings updated.';
			flyStatus = `${successPrefix} ${detail}`.trim();
			return true;
		} catch (error) {
			logSettingsError('saveFly', {
				error,
				message: 'Saving Fly settings threw.'
			});
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
			if (!response.ok) {
				logSettingsError('validateAnthropic', {
					status: response.status,
					message: 'Anthropic key validation failed.'
				});
			}
		} catch (error) {
			logSettingsError('validateAnthropic', {
				error,
				message: 'Anthropic key validation threw.'
			});
			anthropicValidated = false;
		}
	};

	const saveField = async (field: EditableField) => {
		const value = draftValue.trim();
		if (field === 'flyToken' || field === 'flyAppName') {
			const nextFly = { ...fly, [field]: value };
			const ok = await saveFly(
				nextFly,
				field === 'flyToken' ? 'Fly token saved.' : 'Fly app name saved.'
			);
			if (ok) cancelEditField();
			return;
		}

		const nextCredentials = { ...credentials, [field]: value };
		const ok = await saveCredentials(nextCredentials, `${getFieldLabel(field)} saved.`);
		if (ok) {
			if (field === 'anthropic') {
				await validateAnthropic();
			}
			cancelEditField();
		}
	};

	const getFieldStatus = (field: EditableField) => {
		const configured = isFieldConfigured(field);
		if (!configured && editingField !== field) {
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
			return { ready: false, label: configured ? 'Configured' : 'Not tested' };
		}

		return { ready: false, label: configured ? 'Configured' : 'Not tested' };
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
				const payload = (await response.json().catch(() => ({}))) as { message?: string };
				logSettingsError('saveRepos', {
					status: response.status,
					message: payload.message ?? 'Saving repository selection failed.',
					payload
				});
				repoStatus = payload.message ?? 'Failed to save repositories.';
				return;
			}
			configSnapshot = (await response.json()) as ConfigSnapshot;
			repoStatus = 'Repository access saved.';
		} catch (error) {
			logSettingsError('saveRepos', {
				error,
				message: 'Saving repository selection threw.'
			});
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

	const handleCredentialsSaved = async (message = 'Provider keys saved.') => {
		credentialStatus = message;
		await loadConfig();
		await loadAgents(true);
	};

	$effect(() => {
		flySetupMode = normalizeSetupMode($page.url.searchParams.get('setup'));
	});

	onMount(() => {
		flySetupMode = normalizeSetupMode($page.url.searchParams.get('setup'));
		loadAgents(true);
		if (isConnected) {
			loadConfig();
			loadRepositories();
			loadGithubSummary();
			loadAuthDiagnostics();
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
									<h2 class="text-lg font-semibold text-foreground">Keys</h2>
									<p class="mt-1 text-sm text-muted-foreground">API keys and tokens are encrypted and stored by Porter.</p>
								</div>
								<Button size="sm" onclick={() => (showCredentialsModal = true)}>Add Provider Keys</Button>
							</div>

						<div class="rounded-xl border border-border/40 bg-background/30">
							<button
								type="button"
								class="flex w-full items-center justify-between px-4 py-3 text-left"
								onclick={() => (setupExpanded = !setupExpanded)}
							>
								<div>
									<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Optional setup help</p>
									<p class="mt-1 text-sm text-muted-foreground">Token shortcuts and terminal command</p>
								</div>
								<span class="text-xs text-muted-foreground">{setupExpanded ? 'Open' : 'Expand'}</span>
							</button>
							{#if setupExpanded}
								<div class="border-t border-border/40 p-4">
									<div class="grid gap-3 sm:grid-cols-2">
										<div class="rounded-xl border border-border/50 bg-background/40 p-3">
											<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Quick setup</p>
											<p class="mt-1 text-sm font-medium text-foreground">Grab an org token</p>
											<p class="mt-1 text-xs text-muted-foreground">Use one org token. Porter validates it, creates the Fly app when missing, and launches task machines.</p>
											<a
												href="https://fly.io/dashboard/personal/tokens"
												target="_blank"
												rel="noreferrer"
												class="mt-2 inline-block text-xs font-medium text-primary hover:text-primary/80"
											>
												Open Fly tokens ↗
											</a>
										</div>
										<div class="rounded-xl border border-border/50 bg-background/40 p-3">
											<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Terminal setup</p>
											<p class="mt-1 text-sm font-medium text-foreground">Generate token in terminal</p>
											<p class="mt-1 text-xs text-muted-foreground">Prefer terminal? Run this once to mint the same org token.</p>
											<div class="mt-2 rounded-md border border-border/40 bg-background/70 p-2">
												<pre class="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground">{flyCliCommand}</pre>
											</div>
											<div class="mt-2 flex justify-end">
												<button
													type="button"
													class="inline-flex h-7 w-7 items-center justify-center rounded border border-border/60 text-primary hover:border-primary/50 hover:text-primary/80"
													onclick={copyFlyCli}
													aria-label="Copy Fly CLI command"
													title="Copy command"
												>
													{#if flyCliCopied}
														<Check size={14} weight="bold" />
													{:else}
														<Copy size={14} weight="bold" />
													{/if}
												</button>
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>

							<div class="divide-y divide-border/30 rounded-xl border border-border/50 bg-card/30">
								{#each ['flyToken', 'anthropic', 'amp', 'openai'] as field}
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
											{#if isFieldConfigured(field as EditableField)}
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
														{field === 'flyToken' ? 'Connect Fly' : 'Save'}
													</Button>
													<Button variant="ghost" size="sm" onclick={cancelEditField}>Cancel</Button>
												{:else}
													<Button variant="outline" size="sm" onclick={() => startEditField(field as EditableField)}>
													{field === 'flyToken'
														? isFieldConfigured(field as EditableField)
															? 'Reconnect Fly'
															: 'Connect Fly'
														: isFieldConfigured(field as EditableField)
															? 'Update'
															: 'Add'}
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

							<div class="rounded-xl border border-border/50 bg-background/20">
								<button
									type="button"
									class="flex w-full items-center justify-between px-4 py-3 text-left"
									onclick={() => (showFlyAdvanced = !showFlyAdvanced)}
								>
									<div>
										<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Advanced Fly</p>
										<p class="mt-1 text-xs text-muted-foreground">
											{(fly.flyAppName ?? '').trim().length
												? `Using app ${(fly.flyAppName ?? '').trim()}`
												: 'Set app name only for deploy or app-scoped tokens.'}
										</p>
									</div>
									<span class="text-xs text-muted-foreground">{showFlyAdvanced ? 'Hide' : 'Edit app name'}</span>
								</button>
								{#if showFlyAdvanced}
									{@const field = 'flyAppName' as EditableField}
									{@const fieldStatus = getFieldStatus(field)}
									<div class="border-t border-border/40 px-4 py-3">
										<div class="space-y-2">
											<div class="flex flex-wrap items-center gap-3">
												<div class="min-w-[180px]">
													<div class="flex items-center gap-2 text-sm font-medium text-foreground">
														<img src={getFieldIcon(field).src} alt={getFieldIcon(field).alt} class="h-4 w-4 rounded-sm" />
														<span>{getFieldLabel(field)}</span>
													</div>
												</div>
												<div class="min-w-0 flex-1">
													{#if editingField === field}
														<Input
															value={draftValue}
															type="text"
															oninput={(event) => (draftValue = (event.target as HTMLInputElement).value)}
														/>
													{:else}
														{#if isFieldConfigured(field)}
															<p class="text-sm text-muted-foreground">{formatFieldValue(field)}</p>
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
														<Button size="sm" onclick={() => saveField(field)} disabled={credentialSaving || flySaving}>Save</Button>
														<Button variant="ghost" size="sm" onclick={cancelEditField}>Cancel</Button>
													{:else}
														<Button variant="outline" size="sm" onclick={() => startEditField(field)}>
															{isFieldConfigured(field) ? 'Update' : 'Add'}
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
									</div>
								{/if}
							</div>

							<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
								<span class="text-muted-foreground">
									{flyValidationReady ? 'Connected' : 'Need org token'}
								</span>
							</div>
								<div class="flex items-center justify-between text-sm">
									<span class="flex items-center gap-2">
									{#if secretStatus.legacy?.anthropic === 'configured'}<CheckCircle size={16} weight="fill" class="text-emerald-500" />{:else}<WarningCircle size={16} weight="fill" class="text-amber-500" />{/if}
										LLM Keys
									</span>
									<span class="text-muted-foreground">{secretStatus.legacy?.anthropic === 'configured' ? 'Anthropic configured' : 'Missing Anthropic key'}</span>
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
										Webhook Runtime
									</span>
									<span class="text-muted-foreground">{webhookReady ? 'Active' : 'Not ready'}</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="flex items-center gap-2">
										{#if webhookDeliveryReady}<CheckCircle size={16} weight="fill" class="text-emerald-500" />{:else}<WarningCircle size={16} weight="fill" class="text-amber-500" />{/if}
										Webhook Delivery
									</span>
									<span class="text-muted-foreground">{webhookDeliveryReady ? 'Configured' : 'Check app install'}</span>
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
								<Button variant="secondary" href="/api/auth/github?force=1">Reconnect</Button>
								<Button variant="outline" class="text-destructive hover:text-destructive" onclick={handleDisconnect}>Disconnect</Button>
							</div>
							{#if githubStatus}
								<p class="text-xs text-muted-foreground">{githubStatus}</p>
							{/if}
							{#if authDiagnostics}
								<p class="text-xs text-muted-foreground">
									Auth: {authDiagnostics.action === 'ok' ? 'healthy' : authDiagnostics.action === 'install_app' ? 'app install required' : 'runtime check required'}
								</p>
							{/if}
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
			<CredentialsModal bind:open={showCredentialsModal} onsaved={handleCredentialsSaved} />
		{/if}
	</div>
</main>
