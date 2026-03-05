<script lang="ts">
	import { base } from '$app/paths';
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

	type ModelCatalogEntry = {
		id: string;
		name: string;
		providerId: string;
		providerName: string;
		domain: string;
	};

	type ProviderCatalogResponse = {
		featured: ProviderCatalogEntry[];
		all: ProviderCatalogEntry[];
		featuredIds: string[];
		topModels: ModelCatalogEntry[];
		modelSamplesByProvider?: Record<string, Array<{ id: string; name: string }>>;
	};

	let {
		open = $bindable(false),
		onsaved,
		onselectmodel,
		currentSelectedModel = 'anthropic/claude-sonnet-4'
	}: {
		open?: boolean;
		onsaved?: (message?: string) => void;
		onselectmodel?: (modelId: string) => void;
		currentSelectedModel?: string;
	} = $props();

	let catalog = $state<ProviderCatalogResponse>({ featured: [], all: [], featuredIds: [], topModels: [] });
	let providerCredentials = $state<Record<string, Record<string, string>>>({});
	let providerCredentialStatus = $state<Record<string, Record<string, 'configured' | 'not_configured'>>>({});
	let selectedModelDraft = $state('anthropic/claude-sonnet-4');
	let loadedSelectedModel = $state('anthropic/claude-sonnet-4');
	let providerSearch = $state('');
	let modelSearch = $state('');
	let modelScope = $state<'all' | 'top'>('all');
	let modelProviderFilter = $state('all');
	let modelRankFilter = $state<'all' | 'code' | 'thinking' | 'balanced'>('all');
	let showAllProviders = $state(false);
	let loading = $state(false);
	let saving = $state(false);
	let savingProviderKey = $state<Record<string, boolean>>({});
	let status = $state('');

	const modelIconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

	const providerById = $derived.by(() => {
		const map = new Map<string, ProviderCatalogEntry>();
		for (const provider of catalog.all) {
			map.set(provider.id.toLowerCase(), provider);
		}
		for (const provider of catalog.featured) {
			if (!map.has(provider.id.toLowerCase())) {
				map.set(provider.id.toLowerCase(), provider);
			}
		}
		return map;
	});

	const availableModels = $derived.by(() => {
		const deduped = new Map<string, ModelCatalogEntry>();

		for (const model of catalog.topModels ?? []) {
			deduped.set(model.id, model);
		}

		for (const [providerId, samples] of Object.entries(catalog.modelSamplesByProvider ?? {})) {
			const provider = providerById.get(providerId.toLowerCase());
			for (const sample of samples ?? []) {
				if (!deduped.has(sample.id)) {
					deduped.set(sample.id, {
						id: sample.id,
						name: sample.name,
						providerId: provider?.id ?? providerId,
						providerName: provider?.name ?? providerId.toUpperCase(),
						domain: provider?.domain ?? 'github.com'
					});
				}
			}
		}

		return [...deduped.values()];
	});

	const modelProviderOptions = $derived.by(() => {
		const seen = new Set<string>();
		const options: Array<{ id: string; label: string }> = [];
		for (const model of availableModels) {
			const key = model.providerId.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			options.push({ id: key, label: model.providerName });
		}
		return options;
	});

	const filteredModels = $derived.by(() => {
		const query = modelSearch.trim().toLowerCase();
		const topIds = new Set((catalog.topModels ?? []).map((model) => model.id));
		let source = availableModels;
		if (modelScope === 'top') {
			source = source.filter((model) => topIds.has(model.id));
		}
		if (modelProviderFilter !== 'all') {
			source = source.filter((model) => model.providerId.toLowerCase() === modelProviderFilter);
		}
		const classify = (model: ModelCatalogEntry) => {
			const text = `${model.id} ${model.name}`.toLowerCase();
			const isCode = text.includes('codex') || text.includes('coder') || text.includes('code');
			const isThinking =
				text.includes('thinking') ||
				text.includes('reason') ||
				text.includes('sonnet') ||
				text.includes('opus') ||
				text.includes('o1') ||
				text.includes('o3') ||
				text.includes('o4') ||
				text.includes('r1');
			return { isCode, isThinking };
		};
		if (modelRankFilter !== 'all') {
			source = source.filter((model) => {
				const flags = classify(model);
				if (modelRankFilter === 'code') return flags.isCode;
				if (modelRankFilter === 'thinking') return flags.isThinking;
				return flags.isCode && flags.isThinking;
			});
		}
		if (!query) return source;
		return source.filter((model) => {
			return (
				model.id.toLowerCase().includes(query) ||
				model.name.toLowerCase().includes(query) ||
				model.providerName.toLowerCase().includes(query)
			);
		});
	});

	const rankedModels = $derived.by(() => {
		const topIds = new Set((catalog.topModels ?? []).map((model) => model.id.toLowerCase()));
		const scoreModel = (model: ModelCatalogEntry) => {
			const text = `${model.id} ${model.name}`.toLowerCase();
			const isCode = text.includes('codex') || text.includes('coder') || text.includes('code');
			const isThinking =
				text.includes('thinking') ||
				text.includes('reason') ||
				text.includes('sonnet') ||
				text.includes('opus') ||
				text.includes('o1') ||
				text.includes('o3') ||
				text.includes('o4') ||
				text.includes('r1');
			let score = 0;
			if (topIds.has(model.id.toLowerCase())) score += 50;
			if (isCode) score += 20;
			if (isThinking) score += 16;
			if (isCode && isThinking) score += 8;
			if (text.includes('gpt-5') || text.includes('claude') || text.includes('gemini-2.5')) score += 10;
			return score;
		};

		return [...filteredModels].sort((a, b) => {
			const delta = scoreModel(b) - scoreModel(a);
			if (delta !== 0) return delta;
			return a.id.localeCompare(b.id);
		});
	});

	const activeModelMeta = $derived.by(
		() => availableModels.find((model) => model.id === loadedSelectedModel) ?? null
	);

	const hasPendingModelChange = $derived.by(
		() => selectedModelDraft.trim().length > 0 && selectedModelDraft.trim() !== loadedSelectedModel
	);

	const visibleProviders = $derived.by(() => {
		const source = showAllProviders ? catalog.all : catalog.featured;
		const query = providerSearch.trim().toLowerCase();
		if (!query) return source;
		return source.filter((provider) => {
			return (
				provider.name.toLowerCase().includes(query) ||
				provider.id.toLowerCase().includes(query) ||
				provider.env.some((envKey) => envKey.toLowerCase().includes(query))
			);
		});
	});

	const getIconUrl = (provider: ProviderCatalogEntry) =>
		`https://www.google.com/s2/favicons?domain=${provider.domain}&sz=64`;

	const providerMask = (providerId: string, envKey: string) => {
		const draft = providerCredentials[providerId]?.[envKey] ?? '';
		if (draft.trim()) return 'Pending update';
		return providerCredentialStatus[providerId]?.[envKey] === 'configured' ? 'Configured' : 'Not configured';
	};

	const providerKeyId = (providerId: string, envKey: string) => `${providerId}::${envKey}`;

	const load = async () => {
		loading = true;
		status = '';
		try {
			const [catalogResponse, providerCredentialResponse, modelResponse] =
				await Promise.all([
					fetch(`${base}/api/config/providers`, { cache: 'no-store' }),
					fetch(`${base}/api/config/provider-credentials`, { cache: 'no-store' }),
					fetch(`${base}/api/config/model`, { cache: 'no-store' })
				]);

			if (catalogResponse.ok) {
				catalog = (await catalogResponse.json()) as ProviderCatalogResponse;
			}
			if (providerCredentialResponse.ok) {
				providerCredentialStatus = (await providerCredentialResponse.json()) as Record<
					string,
					Record<string, 'configured' | 'not_configured'>
				>;
			}
			if (modelResponse.ok) {
				const modelPayload = (await modelResponse.json()) as { selectedModel?: string };
				loadedSelectedModel = modelPayload.selectedModel?.trim() || currentSelectedModel;
				selectedModelDraft = loadedSelectedModel;
			} else {
				loadedSelectedModel = currentSelectedModel;
				selectedModelDraft = currentSelectedModel;
			}

			providerCredentials = {};
		} catch (error) {
			console.error('Failed to load model settings:', error);
			status = 'Failed to load model settings.';
		} finally {
			loading = false;
		}
	};

	const updateProviderCredential = (providerId: string, envKey: string, value: string) => {
		providerCredentials = {
			...providerCredentials,
			[providerId]: {
				...(providerCredentials[providerId] ?? {}),
				[envKey]: value
			}
		};
	};

	const saveProviderCredential = async (providerId: string, envKey: string) => {
		const keyId = providerKeyId(providerId, envKey);
		savingProviderKey = { ...savingProviderKey, [keyId]: true };
		status = '';
		try {
			const value = providerCredentials[providerId]?.[envKey] ?? '';
			if (!value.trim()) {
				status = `Enter a value to save ${envKey}.`;
				return;
			}
			const response = await fetch(`${base}/api/config/provider-credentials`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [providerId]: { [envKey]: value } })
			});
			if (!response.ok) {
				status = `Failed to save ${envKey}.`;
				return;
			}
			providerCredentialStatus = (await response.json()) as Record<
				string,
				Record<string, 'configured' | 'not_configured'>
			>;
			providerCredentials = {
				...providerCredentials,
				[providerId]: {
					...(providerCredentials[providerId] ?? {}),
					[envKey]: ''
				}
			};
			status = `${envKey} saved.`;
			onsaved?.(status);
		} catch (error) {
			console.error('Failed to save provider key:', error);
			status = `Failed to save ${envKey}.`;
		} finally {
			savingProviderKey = { ...savingProviderKey, [keyId]: false };
		}
	};

	const removeProviderCredential = async (providerId: string, envKey: string) => {
		const keyId = providerKeyId(providerId, envKey);
		savingProviderKey = { ...savingProviderKey, [keyId]: true };
		status = '';
		try {
			const response = await fetch(`${base}/api/config/provider-credentials`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [providerId]: { [envKey]: '' } })
			});
			if (!response.ok) {
				status = `Failed to remove ${envKey}.`;
				return;
			}
			providerCredentialStatus = (await response.json()) as Record<
				string,
				Record<string, 'configured' | 'not_configured'>
			>;
			providerCredentials = {
				...providerCredentials,
				[providerId]: {
					...(providerCredentials[providerId] ?? {}),
					[envKey]: ''
				}
			};
			status = `${envKey} removed.`;
			onsaved?.(status);
		} catch (error) {
			console.error('Failed to remove provider key:', error);
			status = `Failed to remove ${envKey}.`;
		} finally {
			savingProviderKey = { ...savingProviderKey, [keyId]: false };
		}
	};

	const saveModel = async () => {
		saving = true;
		status = '';
		try {
			if (!hasPendingModelChange) {
				status = 'Model is already up to date.';
				return;
			}
			const response = await fetch(`${base}/api/config/model`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ selectedModel: selectedModelDraft.trim() })
			});
			if (!response.ok) {
				status = 'Failed to save model.';
				return;
			}

			loadedSelectedModel = selectedModelDraft.trim() || loadedSelectedModel;
			onselectmodel?.(loadedSelectedModel);
			status = 'Model saved.';
			onsaved?.(status);
		} catch (error) {
			console.error('Failed to save model:', error);
			status = 'Failed to save model.';
		} finally {
			saving = false;
		}
	};

	$effect(() => {
		if (open) {
			void load();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90vh] flex-col sm:max-w-6xl">
		<Dialog.Header class="border-b border-border/40 pb-4">
			<Dialog.Title class="text-xl font-semibold tracking-tight">Model Settings</Dialog.Title>
			<Dialog.Description class="mt-1">
				Set the default execution model and maintain provider API credentials.
			</Dialog.Description>
		</Dialog.Header>

		<div class="custom-scrollbar flex-1 overflow-y-auto py-4 pr-1">
			<div class="overflow-hidden rounded-xl border border-border/60 bg-card/30">
				<section class="space-y-4 p-4">
					<div class="rounded-lg border border-orange-400/35 bg-gradient-to-r from-orange-500/12 to-transparent p-4">
						<div class="flex flex-wrap items-start justify-between gap-2">
							<div>
								<p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Active model</p>
								<p class="mt-2 text-xl font-semibold text-foreground">{loadedSelectedModel}</p>
							</div>
							{#if hasPendingModelChange}
								<span class="rounded-full border border-orange-400/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-orange-300">Unsaved change</span>
							{/if}
						</div>
						<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							{#if activeModelMeta}
								<span class="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5">
									<img src={modelIconUrl(activeModelMeta.domain)} alt={activeModelMeta.providerName} class="h-3.5 w-3.5 rounded-sm" />
									{activeModelMeta.providerName}
								</span>
							{/if}
							<span class="rounded-full border border-border/60 bg-background/60 px-2 py-0.5">Used for new tasks</span>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2 border-y border-border/50 py-3">
						<Input placeholder="Search models" bind:value={modelSearch} class="h-9 min-w-[220px] flex-1" />
						<Button size="sm" variant={modelScope === 'all' ? 'secondary' : 'outline'} onclick={() => (modelScope = 'all')}>All</Button>
						<Button size="sm" variant={modelScope === 'top' ? 'secondary' : 'outline'} onclick={() => (modelScope = 'top')}>Top picks</Button>
						<select
							class="h-9 min-w-[170px] rounded-md border border-border bg-background px-3 text-sm text-foreground"
							bind:value={modelProviderFilter}
						>
							<option value="all">All providers</option>
							{#each modelProviderOptions as option}
								<option value={option.id}>{option.label}</option>
							{/each}
						</select>
						<Input
							value={selectedModelDraft}
							placeholder="anthropic/claude-sonnet-4"
							oninput={(event) => (selectedModelDraft = (event.target as HTMLInputElement).value)}
							class="h-9 min-w-[260px]"
						/>
					</div>

					<div class="flex flex-wrap gap-1.5">
						<button
							type="button"
							onclick={() => (modelRankFilter = 'all')}
							class={`rounded-full border px-2.5 py-1 text-[11px] transition ${modelRankFilter === 'all' ? 'border-orange-400/50 bg-orange-500/10 text-orange-200' : 'border-border/60 bg-background/40 text-muted-foreground hover:border-orange-300/40'}`}
						>
							All ranked
						</button>
						<button
							type="button"
							onclick={() => (modelRankFilter = 'code')}
							class={`rounded-full border px-2.5 py-1 text-[11px] transition ${modelRankFilter === 'code' ? 'border-orange-400/50 bg-orange-500/10 text-orange-200' : 'border-border/60 bg-background/40 text-muted-foreground hover:border-orange-300/40'}`}
						>
							Code focus
						</button>
						<button
							type="button"
							onclick={() => (modelRankFilter = 'thinking')}
							class={`rounded-full border px-2.5 py-1 text-[11px] transition ${modelRankFilter === 'thinking' ? 'border-orange-400/50 bg-orange-500/10 text-orange-200' : 'border-border/60 bg-background/40 text-muted-foreground hover:border-orange-300/40'}`}
						>
							Thinking focus
						</button>
						<button
							type="button"
							onclick={() => (modelRankFilter = 'balanced')}
							class={`rounded-full border px-2.5 py-1 text-[11px] transition ${modelRankFilter === 'balanced' ? 'border-orange-400/50 bg-orange-500/10 text-orange-200' : 'border-border/60 bg-background/40 text-muted-foreground hover:border-orange-300/40'}`}
						>
							Balanced code+thinking
						</button>
					</div>

					<div class="overflow-hidden rounded-lg border border-border/60 bg-background/35">
						<div class="flex items-center justify-between border-b border-border/50 px-3 py-2 text-xs text-muted-foreground">
							<span>Model options</span>
							<span>{rankedModels.length} shown</span>
						</div>
						<div class="max-h-[360px] overflow-y-auto">
							{#if loading}
								<p class="px-3 py-2 text-xs text-muted-foreground">Loading model options...</p>
							{:else if rankedModels.length === 0}
								<p class="px-3 py-2 text-xs text-muted-foreground">No model options found.</p>
							{:else}
								<div class="divide-y divide-border/40">
									{#each rankedModels as model}
										<button
											type="button"
											onclick={() => (selectedModelDraft = model.id)}
											class={`w-full px-3 py-2.5 text-left transition ${selectedModelDraft === model.id ? 'bg-orange-500/10' : 'hover:bg-background/70'}`}
										>
											<div class="flex items-center justify-between gap-3">
												<div class="min-w-0">
													<p class="truncate text-sm font-medium text-foreground">{model.name}</p>
													<p class="truncate text-xs text-muted-foreground">{model.id} · {model.providerName}</p>
												</div>
												<div class="flex items-center gap-1.5">
													{#if model.id === loadedSelectedModel}
														<span class="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-300">Active</span>
													{/if}
													{#if model.id === selectedModelDraft}
														<span class="rounded-full border border-orange-400/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-orange-300">Selected</span>
													{/if}
												</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</section>

				<section class="space-y-3 border-t border-border/50 p-4">
				<div class="flex flex-wrap items-center gap-2">
					<h3 class="text-sm font-semibold text-foreground">Provider API Keys</h3>
					<Input placeholder="Search providers or env keys" bind:value={providerSearch} class="h-9 max-w-[320px]" />
					<Button variant={showAllProviders ? 'secondary' : 'outline'} size="sm" onclick={() => (showAllProviders = !showAllProviders)}>
						{showAllProviders ? 'Featured only' : 'Show all providers'}
					</Button>
				</div>

				<div class="space-y-2">
					{#if loading}
						<p class="text-sm text-muted-foreground">Loading providers...</p>
					{:else if visibleProviders.length === 0}
						<p class="text-sm text-muted-foreground">No provider matches your search.</p>
					{:else}
						{#each visibleProviders as provider}
							<div class="rounded-lg border border-border/60 bg-background/35 p-3">
								<div class="mb-2 flex items-center justify-between gap-3">
									<div class="flex min-w-0 items-center gap-2">
										<img src={getIconUrl(provider)} alt={provider.name} class="h-4 w-4 rounded-sm" />
										<div>
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
													<p class="text-[11px] text-muted-foreground">{providerMask(provider.id, envKey)}</p>
												</div>
												<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
													<Input
														type="password"
														value={providerCredentials[provider.id]?.[envKey] ?? ''}
														placeholder={`Enter ${envKey}`}
														oninput={(event) =>
															updateProviderCredential(provider.id, envKey, (event.target as HTMLInputElement).value)}
													/>
													<Button
														size="sm"
														variant="secondary"
														disabled={
															savingProviderKey[providerKeyId(provider.id, envKey)] ||
															!(providerCredentials[provider.id]?.[envKey] ?? '').trim()
														}
														onclick={() => saveProviderCredential(provider.id, envKey)}
													>
														{savingProviderKey[providerKeyId(provider.id, envKey)]
															? 'Saving...'
															: 'Save key'}
													</Button>
													{#if providerCredentialStatus[provider.id]?.[envKey] === 'configured'}
														<Button
															size="sm"
															variant="outline"
															class="text-destructive hover:text-destructive"
															disabled={savingProviderKey[providerKeyId(provider.id, envKey)]}
															onclick={() => removeProviderCredential(provider.id, envKey)}
														>
															Remove key
														</Button>
													{/if}
												</div>
											</div>
										{/each}
									</div>
							</div>
						{/each}
					{/if}
				</div>
				</section>
			</div>
		</div>

		<Dialog.Footer class="border-t border-border/40 pt-4">
			{#if status}
				<p class="mr-auto text-xs text-muted-foreground">{status}</p>
			{/if}
			<Button variant="ghost" onclick={() => (open = false)}>Close</Button>
			<Button onclick={saveModel} disabled={saving || !hasPendingModelChange}>{saving ? 'Saving...' : 'Save model'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
