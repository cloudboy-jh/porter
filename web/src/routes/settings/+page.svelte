<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { Brain, GithubLogo } from 'phosphor-svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import CredentialsModal from '$lib/components/CredentialsModal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { PageData } from './$types';

	type ProviderCatalogEntry = {
		id: string;
		name: string;
		doc?: string;
		env: string[];
		domain: string;
	};

	type ModelCatalogEntry = {
		id: string;
		name: string;
		providerId: string;
		providerName: string;
		domain: string;
		reasoning: boolean;
		toolCall: boolean;
		contextWindow: number;
		releaseDate?: string;
	};

	type ProviderCatalogResponse = {
		featured: ProviderCatalogEntry[];
		all: ProviderCatalogEntry[];
		featuredIds: string[];
		topModels: ModelCatalogEntry[];
		modelSamplesByProvider?: Record<string, Array<{ id: string; name: string }>>;
	};

	let { data } = $props<{ data: PageData }>();
	const isConnected = $derived(Boolean(data?.session));
	const githubHandle = $derived(data?.session?.user?.login ? `@${data.session.user.login}` : '');

	let showCredentialsModal = $state(false);
	let selectedModel = $state('anthropic/claude-sonnet-4');
	let modelStatus = $state('');
	let modelMeta = $state<ModelCatalogEntry | null>(null);
	let loading = $state(false);

	const providerIconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

	const load = async () => {
		loading = true;
		try {
			const [providersRes, modelRes] = await Promise.all([
				fetch(`${base}/api/config/providers?ts=${Date.now()}`, { cache: 'no-store' }),
				fetch(`${base}/api/config/model`, { cache: 'no-store' })
			]);

			let providers: ProviderCatalogResponse | null = null;
			if (providersRes.ok) {
				providers = (await providersRes.json()) as ProviderCatalogResponse;
			}
			if (modelRes.ok) {
				const modelPayload = (await modelRes.json()) as { selectedModel?: string };
				selectedModel = modelPayload.selectedModel ?? selectedModel;
			}

			const sampleModels = providers?.modelSamplesByProvider
				? Object.values(providers.modelSamplesByProvider).flat()
				: [];
			const topModels = providers?.topModels ?? [];
			const modelFromCatalog =
				topModels.find((model) => model.id === selectedModel) ??
				sampleModels.find((model) => model.id === selectedModel);
			if (modelFromCatalog && 'providerName' in modelFromCatalog) {
				modelMeta = modelFromCatalog as ModelCatalogEntry;
			} else {
				const providerId = selectedModel.includes('/') ? selectedModel.split('/')[0] : 'custom';
				modelMeta = {
					id: selectedModel,
					name: selectedModel,
					providerId,
					providerName: providerId.toUpperCase(),
					domain: 'github.com',
					reasoning: false,
					toolCall: false,
					contextWindow: 0
				};
			}
		} finally {
			loading = false;
		}
	};

	const handleCredentialsSaved = async (message = 'Model keys saved.') => {
		modelStatus = message;
		await load();
	};

	const handleModelSelected = (model: string) => {
		selectedModel = model;
		modelStatus = `Selected model: ${model}`;
	};

	const disconnect = async () => {
		await fetch(`${base}/api/auth/logout`, { method: 'POST' });
		window.location.href = `${base}/auth`;
	};

	onMount(() => {
		if (isConnected) {
			load();
		}
	});
</script>

<main class="flex-1 overflow-y-auto">
	<div class="mx-auto w-full max-w-[1200px] px-6 pt-8 pb-16">
		{#if !isConnected}
			<EmptyState
				icon={GithubLogo}
				title="Connect GitHub to manage settings"
				description="Authorize Porter to configure model defaults and model keys."
				actionLabel="Connect GitHub"
				actionHref="/api/auth/github"
				variant="hero"
			/>
		{:else}
			<div class="space-y-8">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700/80 dark:text-orange-300/80">Workspace</p>
						<h1 class="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Model Settings</h1>
					</div>
					<Button size="sm" class="gap-2 shadow-[0_10px_28px_rgba(251,146,60,0.22)]" onclick={() => (showCredentialsModal = true)}>
						<Brain size={14} weight="duotone" />
						Manage Model Keys
					</Button>
				</div>

				<section class="relative overflow-hidden rounded-2xl border border-orange-300/35 bg-gradient-to-br from-orange-100/70 via-amber-100/50 to-transparent min-h-[360px] p-7 shadow-[0_24px_60px_rgba(251,146,60,0.12)] dark:from-orange-500/12 dark:via-amber-500/8">
						<div class="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-orange-400/20 blur-3xl dark:bg-orange-500/20"></div>
						<div class="pointer-events-none absolute -right-10 -bottom-14 h-40 w-40 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-400/15"></div>
						<div class="relative flex h-full flex-col items-center justify-center text-center">
							<p class="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700/80 dark:text-orange-300/80">Active model</p>
							{#if modelMeta}
								<img src={providerIconUrl(modelMeta.domain)} alt={modelMeta.providerName} class="mt-4 h-7 w-7 rounded-sm" />
							{/if}
							<p class="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{loading ? 'Loading model...' : selectedModel}</p>
							<p class="mt-2 max-w-[520px] text-sm text-muted-foreground">This is the default execution model Porter uses for new tasks unless overridden in dispatch settings.</p>
							{#if modelMeta}
								<div class="mt-4 flex flex-wrap justify-center gap-2 text-xs">
									<span class="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-muted-foreground">Provider: {modelMeta.providerName}</span>
									<span class="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-muted-foreground">Role: default execution</span>
								</div>
							{/if}
							<div class="mt-7 flex justify-center">
								<Button class="h-11 px-8 text-base font-semibold shadow-[0_12px_30px_rgba(251,146,60,0.28)]" onclick={() => (showCredentialsModal = true)}>
									Change model
								</Button>
							</div>
							{#if modelStatus}
								<p class="mt-4 text-xs text-muted-foreground">{modelStatus}</p>
							{/if}
						</div>
					</section>

				<div class="flex justify-center">
					<section class="w-full max-w-[680px] space-y-4 rounded-2xl border border-border/50 bg-card/30 p-5 text-center">
						<p class="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">GitHub</p>
						<div class="flex items-center justify-center gap-3">
							{#if data?.session?.user?.avatarUrl}
								<img src={data.session.user.avatarUrl} alt={githubHandle} class="h-11 w-11 rounded-full border border-border/70 object-cover" />
							{:else}
								<div class="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted text-xs font-semibold text-muted-foreground">
									GH
								</div>
							{/if}
							<div>
								<p class="text-sm font-medium text-foreground">{githubHandle}</p>
								<p class="text-xs text-muted-foreground">Connected for repository and settings access.</p>
							</div>
						</div>
						<div class="flex flex-wrap justify-center gap-2">
							<Button variant="secondary" href={`${base}/api/auth/github?force=1`}>Reconnect</Button>
							<Button variant="outline" class="text-destructive hover:text-destructive" onclick={disconnect}>Disconnect</Button>
						</div>
					</section>
				</div>
			</div>

			<CredentialsModal
				bind:open={showCredentialsModal}
				onsaved={handleCredentialsSaved}
				onselectmodel={handleModelSelected}
				currentSelectedModel={selectedModel}
			/>
		{/if}
	</div>
</main>
