<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

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

	let {
		open = $bindable(false),
		onsaved
	}: {
		open?: boolean;
		onsaved?: () => void;
	} = $props();

	let catalog = $state<ProviderCatalogResponse>({ featured: [], all: [], featuredIds: [] });
	let providerCredentials = $state<Record<string, Record<string, string>>>({});
	let providerCredentialStatus = $state<Record<string, Record<string, 'configured' | 'not_configured'>>>({});
	let search = $state('');
	let showAll = $state(false);
	let loading = $state(false);
	let saving = $state(false);
	let status = $state('');

	const visibleProviders = $derived.by(() => {
		const source = showAll ? catalog.all : catalog.featured;
		const query = search.trim().toLowerCase();
		if (!query) return source;
		return source.filter((provider) => {
			const matchesName = provider.name.toLowerCase().includes(query);
			const matchesId = provider.id.toLowerCase().includes(query);
			const matchesEnv = provider.env.some((key) => key.toLowerCase().includes(query));
			return matchesName || matchesId || matchesEnv;
		});
	});

	const getIconUrl = (provider: ProviderCatalogEntry) =>
		`https://www.google.com/s2/favicons?domain=${provider.domain}&sz=64`;

	const mask = (providerId: string, envKey: string) => {
		const draft = providerCredentials[providerId]?.[envKey] ?? '';
		if (draft.trim()) return 'Pending update';
		return providerCredentialStatus[providerId]?.[envKey] === 'configured'
			? 'Configured'
			: 'Not configured';
	};

	const load = async () => {
		loading = true;
		status = '';
		try {
			const [catalogResponse, credentialsResponse] = await Promise.all([
				fetch('/api/config/providers'),
				fetch('/api/config/provider-credentials')
			]);
			if (catalogResponse.ok) {
				catalog = (await catalogResponse.json()) as ProviderCatalogResponse;
			}
			if (credentialsResponse.ok) {
				providerCredentialStatus = (await credentialsResponse.json()) as Record<
					string,
					Record<string, 'configured' | 'not_configured'>
				>;
				providerCredentials = {};
			}
		} catch (error) {
			console.error('Failed to load credential catalog:', error);
			status = 'Failed to load provider catalog.';
		} finally {
			loading = false;
		}
	};

	const updateCredential = (providerId: string, envKey: string, value: string) => {
		const nextProviderValues = { ...(providerCredentials[providerId] ?? {}) };
		nextProviderValues[envKey] = value;
		providerCredentials = { ...providerCredentials, [providerId]: nextProviderValues };
	};

	const save = async () => {
		saving = true;
		status = '';
		try {
			const cleaned: Record<string, Record<string, string>> = {};
			for (const [providerId, values] of Object.entries(providerCredentials)) {
				const nextValues: Record<string, string> = {};
				for (const [envKey, value] of Object.entries(values)) {
					const trimmed = value.trim();
					if (trimmed) {
						nextValues[envKey] = trimmed;
					}
				}
				if (Object.keys(nextValues).length > 0) {
					cleaned[providerId] = nextValues;
				}
			}

			const response = await fetch('/api/config/provider-credentials', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(cleaned)
			});
			if (!response.ok) {
				status = 'Failed to save credentials.';
				return;
			}
			providerCredentialStatus = (await response.json()) as Record<
				string,
				Record<string, 'configured' | 'not_configured'>
			>;
			providerCredentials = {};
			status = 'Credentials saved.';
			onsaved?.();
		} catch (error) {
			console.error('Failed to save provider credentials:', error);
			status = 'Failed to save credentials.';
		} finally {
			saving = false;
		}
	};

	$effect(() => {
		if (open) {
			load();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[88vh] flex-col sm:max-w-5xl">
		<Dialog.Header class="border-b border-border/40 pb-4">
			<Dialog.Title>Credentials</Dialog.Title>
			<Dialog.Description>
				Set API keys for featured providers, or expand to all OpenCode providers.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex items-center gap-2 border-b border-border/40 py-3">
			<Input placeholder="Search providers or env keys" bind:value={search} class="h-9" />
			<Button variant={showAll ? 'secondary' : 'outline'} size="sm" onclick={() => (showAll = !showAll)}>
				{showAll ? 'Featured only' : 'Show all providers'}
			</Button>
		</div>

		<div class="custom-scrollbar flex-1 space-y-3 overflow-y-auto py-4 pr-1">
			{#if loading}
				<p class="text-sm text-muted-foreground">Loading providers...</p>
			{:else if visibleProviders.length === 0}
				<p class="text-sm text-muted-foreground">No providers match your search.</p>
			{:else}
				{#each visibleProviders as provider}
					<div class="rounded-xl border border-border/60 bg-card/60 p-4">
						<div class="mb-3 flex items-center justify-between gap-3">
							<div class="flex min-w-0 items-center gap-2.5">
								<img src={getIconUrl(provider)} alt={provider.name} class="h-4 w-4 rounded-sm" />
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-foreground">{provider.name}</p>
									<p class="text-xs text-muted-foreground">{provider.id}</p>
								</div>
							</div>
							{#if provider.doc}
								<a href={provider.doc} target="_blank" rel="noreferrer" class="text-xs text-primary hover:text-primary/80">Docs ↗</a>
							{/if}
						</div>

						<div class="space-y-2">
							{#each provider.env as envKey}
								<div class="grid gap-2 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)] sm:items-center">
									<div>
										<p class="text-xs font-medium text-foreground">{envKey}</p>
										<p class="text-[11px] text-muted-foreground">{mask(provider.id, envKey)}</p>
									</div>
									<Input
										type="password"
										value={providerCredentials[provider.id]?.[envKey] ?? ''}
										placeholder={`Enter ${envKey}`}
										oninput={(event) =>
											updateCredential(provider.id, envKey, (event.target as HTMLInputElement).value)}
									/>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<Dialog.Footer class="border-t border-border/40 pt-4">
			{#if status}
				<p class="mr-auto text-xs text-muted-foreground">{status}</p>
			{/if}
			<Button variant="ghost" onclick={() => (open = false)}>Close</Button>
			<Button onclick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Credentials'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
