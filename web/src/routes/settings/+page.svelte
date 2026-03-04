<script lang="ts">
	import { onMount } from 'svelte';
	import { Brain, GithubLogo, Lightning } from 'phosphor-svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import CredentialsModal from '$lib/components/CredentialsModal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
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
	};

	let { data } = $props<{ data: PageData }>();
	const isConnected = $derived(Boolean(data?.session));
	const githubHandle = $derived(data?.session?.user?.login ? `@${data.session.user.login}` : '');

	let showCredentialsModal = $state(false);
	let topModels = $state<ModelCatalogEntry[]>([]);
	let selectedModel = $state('anthropic/claude-sonnet-4');
	let modelDraft = $state('anthropic/claude-sonnet-4');
	let modelStatus = $state('');
	let loading = $state(false);
	let savingModel = $state(false);

	const iconFor = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

	const load = async () => {
		loading = true;
		try {
			const [providersRes, modelRes] = await Promise.all([
				fetch(`/api/config/providers?ts=${Date.now()}`, { cache: 'no-store' }),
				fetch('/api/config/model', { cache: 'no-store' })
			]);
			if (providersRes.ok) {
				const providers = (await providersRes.json()) as ProviderCatalogResponse;
				topModels = providers.topModels ?? [];
			}
			if (modelRes.ok) {
				const modelPayload = (await modelRes.json()) as { selectedModel?: string };
				selectedModel = modelPayload.selectedModel ?? selectedModel;
				modelDraft = selectedModel;
			}
		} finally {
			loading = false;
		}
	};

	const saveModel = async () => {
		if (!modelDraft.trim()) return;
		savingModel = true;
		modelStatus = '';
		try {
			const response = await fetch('/api/config/model', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ selectedModel: modelDraft.trim() })
			});
			if (!response.ok) {
				modelStatus = 'Failed to save model.';
				return;
			}
			const payload = (await response.json()) as { selectedModel: string };
			selectedModel = payload.selectedModel;
			modelDraft = payload.selectedModel;
			modelStatus = 'Default model saved.';
		} catch {
			modelStatus = 'Failed to save model.';
		} finally {
			savingModel = false;
		}
	};

	const chooseModel = (model: string) => {
		modelDraft = model;
	};

	const handleCredentialsSaved = async (message = 'Model keys saved.') => {
		modelStatus = message;
		await load();
	};

	const disconnect = async () => {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/auth';
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
				<div class="rounded-2xl border border-orange-300/30 bg-gradient-to-br from-orange-100/60 via-amber-100/40 to-transparent p-6 dark:from-orange-500/10 dark:via-amber-500/5">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600/80 dark:text-orange-300/80">Settings</p>
							<h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Model Control Center</h1>
							<p class="mt-2 max-w-[650px] text-sm text-muted-foreground">Top 5 model picks refresh from the registry on every load. Pick your default, then manage model keys in one place.</p>
						</div>
						<Button size="sm" class="gap-2" onclick={() => (showCredentialsModal = true)}>
							<Brain size={14} weight="duotone" />
							Manage Model Keys
						</Button>
					</div>
				</div>

				<section class="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-5">
					<div class="flex items-center gap-2">
						<Lightning size={16} weight="duotone" class="text-orange-500" />
						<h2 class="text-base font-semibold text-foreground">Top 5 Models (Current Registry)</h2>
					</div>
					<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
						{#if loading && topModels.length === 0}
							<p class="text-sm text-muted-foreground">Loading model registry...</p>
						{:else}
							{#each topModels as model}
								<button
									type="button"
									onclick={() => chooseModel(model.id)}
									class={`group rounded-xl border p-3 text-left transition ${modelDraft === model.id ? 'border-orange-400/70 bg-orange-500/10 shadow-[0_8px_24px_rgba(251,146,60,0.16)]' : 'border-border/60 bg-background/60 hover:border-orange-300/50 hover:bg-orange-500/5'}`}
								>
									<div class="mb-2 flex items-center gap-2">
										<img src={iconFor(model.domain)} alt={model.providerName} class="h-4 w-4 rounded-sm" />
										<span class="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{model.providerName}</span>
									</div>
									<p class="line-clamp-2 text-sm font-semibold text-foreground">{model.name}</p>
									<p class="mt-1 truncate text-xs text-muted-foreground">{model.id}</p>
								</button>
							{/each}
						{/if}
					</div>
				</section>

				<section class="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-5">
					<div class="flex items-start justify-between gap-3">
						<div>
							<h2 class="text-lg font-semibold text-foreground">Default model</h2>
							<p class="mt-1 text-sm text-muted-foreground">Use a top pick above or type any registry model id directly.</p>
						</div>
						<Button variant="secondary" size="sm" onclick={() => (showCredentialsModal = true)}>Model Keys</Button>
					</div>

					<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
						<div class="space-y-2">
							<Input
								value={modelDraft}
								placeholder="anthropic/claude-sonnet-4"
								oninput={(event) => (modelDraft = (event.target as HTMLInputElement).value)}
							/>
							<div class="text-xs text-muted-foreground">
								Current: <span class="font-medium text-foreground">{selectedModel}</span>
							</div>
						</div>
						<Button onclick={saveModel} disabled={savingModel || loading}>{savingModel ? 'Saving...' : 'Save model'}</Button>
					</div>

					{#if modelStatus}
						<p class="text-xs text-muted-foreground">{modelStatus}</p>
					{/if}
				</section>

				<section class="space-y-3 rounded-2xl border border-border/50 bg-card/30 p-5">
					<p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">GitHub</p>
					<p class="text-sm text-foreground">Signed in as {githubHandle}</p>
					<div class="flex flex-wrap gap-2">
						<Button variant="secondary" href="/api/auth/github?force=1">Reconnect</Button>
						<Button variant="outline" class="text-destructive hover:text-destructive" onclick={disconnect}>Disconnect</Button>
					</div>
				</section>
			</div>

			<CredentialsModal bind:open={showCredentialsModal} onsaved={handleCredentialsSaved} />
		{/if}
	</div>
</main>
