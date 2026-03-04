<script lang="ts">
	import { onMount } from 'svelte';
	import { GithubLogo } from 'phosphor-svelte';
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

	type ProviderCatalogResponse = {
		featured: ProviderCatalogEntry[];
		all: ProviderCatalogEntry[];
		featuredIds: string[];
	};

	let { data } = $props<{ data: PageData }>();
	const isConnected = $derived(Boolean(data?.session));
	const githubHandle = $derived(data?.session?.user?.login ? `@${data.session.user.login}` : '');

	let showCredentialsModal = $state(false);
	let availableModels = $state<string[]>([]);
	let selectedModel = $state('anthropic/claude-sonnet-4');
	let modelDraft = $state('anthropic/claude-sonnet-4');
	let modelStatus = $state('');
	let loading = $state(false);
	let savingModel = $state(false);

	const load = async () => {
		loading = true;
		try {
			const [providersRes, modelRes] = await Promise.all([
				fetch('/api/config/providers'),
				fetch('/api/config/model')
			]);
			if (providersRes.ok) {
				const providers = (await providersRes.json()) as ProviderCatalogResponse;
				availableModels = providers.all.map((provider) => provider.id).slice(0, 20);
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

	const handleCredentialsSaved = async (message = 'Provider keys saved.') => {
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
				description="Authorize Porter to configure model defaults and provider keys."
				actionLabel="Connect GitHub"
				actionHref="/api/auth/github"
				variant="hero"
			/>
		{:else}
			<div class="space-y-8">
				<h1 class="text-2xl font-semibold text-foreground">Settings</h1>

				<section class="space-y-4 rounded-xl border border-border/50 bg-card/30 p-5">
					<div class="flex items-start justify-between gap-3">
						<div>
							<h2 class="text-lg font-semibold text-foreground">Model + Keys</h2>
							<p class="mt-1 text-sm text-muted-foreground">Set your default model and manage provider API keys.</p>
						</div>
						<Button size="sm" onclick={() => (showCredentialsModal = true)}>Manage Provider Keys</Button>
					</div>

					<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
						<div class="space-y-2">
							<p class="text-sm font-medium text-foreground">Default model</p>
							<Input
								value={modelDraft}
								placeholder="anthropic/claude-sonnet-4"
								oninput={(event) => (modelDraft = (event.target as HTMLInputElement).value)}
							/>
							{#if availableModels.length}
								<p class="text-xs text-muted-foreground">
									Suggested providers: {availableModels.join(', ')}
								</p>
							{/if}
						</div>
						<Button onclick={saveModel} disabled={savingModel || loading}>
							{savingModel ? 'Saving...' : 'Save model'}
						</Button>
					</div>

					<div class="text-xs text-muted-foreground">
						Current: <span class="font-medium text-foreground">{selectedModel}</span>
					</div>
					{#if modelStatus}
						<p class="text-xs text-muted-foreground">{modelStatus}</p>
					{/if}
				</section>

				<section class="space-y-3 rounded-xl border border-border/50 bg-card/30 p-5">
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
