<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowSquareOut,
		CaretDown,
		Check,
		GitBranch,
		PaperPlaneTilt,
		Sparkle
	} from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import type { ParsedCommand, GitHubIssue } from '$lib/types/model';
	import { COMMAND_TEMPLATES } from '$lib/constants/command-templates';
	import { getRecentCommands, addRecentCommand, formatTimeAgo } from '$lib/utils/command-storage';

	type ModelOption = {
		id: string;
		label: string;
	};

	type ProviderCatalogEntry = {
		id: string;
		name: string;
		domain: string;
		env: string[];
	};

	type ProviderCatalogModel = {
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
		modelSamplesByProvider?: Record<string, ProviderCatalogModel[]>;
	};

	let {
		open = $bindable(false),
		models = [] as ModelOption[],
		onsubmit
	}: {
		open?: boolean;
		models?: ModelOption[];
		onsubmit?: (payload: ParsedCommand) => void;
	} = $props();

	// State
	let selectedModel = $state<string>('');
	let repository = $state('');
	let issueNumber = $state('');
	let priority = $state('normal');
	let customPrompt = $state('');
	let error = $state('');
	let issuePreview = $state<GitHubIssue | null>(null);
	let loadingIssue = $state(false);
	let repositories = $state<Array<{ id: number; fullName: string; description: string | null }>>([]);
	let repoLoading = $state(false);
	let repoError = $state('');
	let providerCatalog = $state<ProviderCatalogResponse | null>(null);
	let providerLoading = $state(false);
	let providerError = $state('');
	let selectedProviderId = $state('');

	// Derived
	const recentCommands = $derived(getRecentCommands());
	const repositoryLabel = $derived(repository || 'Select repository');
	const providerIconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	const providerFromModel = (value: string) =>
		value.includes('/') ? value.split('/')[0].toLowerCase() : value.toLowerCase();

	const providers = $derived.by(() => {
		if (providerCatalog?.featured?.length) {
			return providerCatalog.featured.map((provider) => ({
				id: provider.id,
				label: provider.name,
				domain: provider.domain
			}));
		}

		return models.map((provider) => ({
			id: provider.id,
			label: provider.label,
			domain: 'github.com'
		}));
	});

	const hasModels = $derived(providers.length > 0);
	const selectedProvider = $derived.by(() =>
		providers.find((provider) => provider.id.toLowerCase() === selectedProviderId.toLowerCase())
	);
	const selectedProviderModels = $derived.by(() => {
		if (!providerCatalog?.modelSamplesByProvider || !selectedProviderId) return [];
		return providerCatalog.modelSamplesByProvider[selectedProviderId.toLowerCase()] ?? [];
	});
	const recentModelsForSelectedProvider = $derived.by(() => {
		if (!selectedProviderId) return [] as Array<{ id: string; name: string }>;

		const recent = recentCommands
			.filter((cmd) => cmd.model.includes('/') && providerFromModel(cmd.model) === selectedProviderId.toLowerCase())
			.slice(0, 10);

		const unique = new Map<string, { id: string; name: string }>();
		for (const cmd of recent) {
			if (unique.has(cmd.model)) continue;
			const known = selectedProviderModels.find((model) => model.id === cmd.model);
			const fallbackName = cmd.model.includes('/') ? cmd.model.split('/')[1] : cmd.model;
			unique.set(cmd.model, {
				id: cmd.model,
				name: known?.name ?? fallbackName
			});
			if (unique.size >= 3) break;
		}

		return [...unique.values()];
	});

	const allModelsForSelectedProvider = $derived.by(() => {
		if (!selectedProviderId) return [] as Array<{ id: string; name: string }>;
		const recentSet = new Set(recentModelsForSelectedProvider.map((model) => model.id));
		return selectedProviderModels
			.filter((model) => !recentSet.has(model.id))
			.map((model) => ({ id: model.id, name: model.name }));
	});

	const hasIssueNumber = $derived(/^\d+$/.test(issueNumber));
	const hasPrompt = $derived(customPrompt.trim().length > 0);
	const isValid = $derived(
		selectedModel.includes('/') &&
		repository &&
		/^[\w.-]+\/[\w.-]+$/.test(repository) &&
		(hasIssueNumber || hasPrompt)
	);

	// Reset form
	const reset = () => {
		selectedModel = '';
		repository = '';
		issueNumber = '';
		priority = 'normal';
		customPrompt = '';
		error = '';
		issuePreview = null;
		selectedProviderId = '';
	};

	const loadProviderCatalog = async () => {
		providerLoading = true;
		providerError = '';
		try {
			const response = await fetch('/api/config/providers');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				providerError = 'Providers unavailable.';
				providerCatalog = null;
				return;
			}
			providerCatalog = (await response.json()) as ProviderCatalogResponse;
		} catch (err) {
			console.error('Failed to load providers:', err);
			providerError = 'Providers unavailable.';
			providerCatalog = null;
		} finally {
			providerLoading = false;
		}
	};

	const loadRepositories = async () => {
		repoLoading = true;
		repoError = '';
		try {
			const response = await fetch('/api/github/repositories');
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				const payload = await response.json().catch(() => ({} as { message?: string }));
				repoError = payload.message ?? 'Repositories unavailable.';
				repositories = [];
				return;
			}
			const payload = (await response.json()) as {
				repositories: Array<{ id: number; fullName: string; description: string | null }>;
			};
			repositories = payload.repositories ?? [];
		} catch (err) {
			console.error('Failed to load repositories:', err);
			repoError = 'Repositories unavailable.';
			repositories = [];
		} finally {
			repoLoading = false;
		}
	};

	onMount(() => {
		loadProviderCatalog();
		loadRepositories();
	});

	// Fetch issue preview
	const fetchIssuePreview = async () => {
		if (!repository || !issueNumber) return;
		
		const match = repository.match(/^([\w.-]+)\/([\w.-]+)$/);
		if (!match) return;

		loadingIssue = true;
		error = '';

		try {
			const response = await fetch(`/api/github/issues/${match[1]}/${match[2]}/${issueNumber}`);
			if (response.status === 401) {
				window.location.href = '/auth';
				return;
			}
			if (!response.ok) {
				error = 'Issue preview is unavailable.';
				issuePreview = null;
				return;
			}
			issuePreview = (await response.json()) as GitHubIssue;
		} catch (err) {
			console.error('Issue preview failed:', err);
			error = 'Failed to fetch issue details';
			issuePreview = null;
		} finally {
			loadingIssue = false;
		}
	};

	// Watch for issue changes
	$effect(() => {
		if (repository && hasIssueNumber) {
			fetchIssuePreview();
		} else {
			issuePreview = null;
		}
	});

	// Handle submit
	const handleSubmit = () => {
		if (!isValid) {
			error = hasIssueNumber || hasPrompt
				? 'Please fill in all required fields'
				: 'Add an issue number or a prompt to create a new issue';
			return;
		}

		const [owner, repo] = repository.split('/');
		const fallbackModelForProvider = selectedProviderModels[0]?.id ?? selectedProviderId;
		const resolvedModel = selectedModel.includes('/') ? selectedModel : fallbackModelForProvider;
		const payload: ParsedCommand = {
			model: resolvedModel,
			repoOwner: owner,
			repoName: repo,
			issueNumber: hasIssueNumber ? parseInt(issueNumber) : 0,
			priority,
			prompt: customPrompt
		};

		// Save to recent commands
		if (hasIssueNumber) {
			addRecentCommand({
				model: resolvedModel,
				repository,
				issue: parseInt(issueNumber),
				issueTitle: issuePreview?.title,
				priority
			});
		}

		onsubmit?.(payload);
		open = false;
		reset();
	};

	// Use recent command
	const useRecentCommand = (cmd: typeof recentCommands[0]) => {
		selectedModel = cmd.model;
		selectedProviderId = providerFromModel(cmd.model);
		repository = cmd.repository;
		issueNumber = cmd.issue.toString();
		priority = cmd.priority;
	};

	const selectProvider = (providerId: string) => {
		selectedProviderId = providerId;
		if (providerFromModel(selectedModel) === providerId.toLowerCase() && selectedModel.includes('/')) {
			return;
		}
		const firstModel = providerCatalog?.modelSamplesByProvider?.[providerId.toLowerCase()]?.[0];
		selectedModel = firstModel?.id ?? providerId;
	};

	// Use template
	const useTemplate = (template: typeof COMMAND_TEMPLATES[0]) => {
		priority = template.priority;
		customPrompt = template.promptTemplate;
	};

	// Keyboard shortcuts
	const handleKeydown = (event: KeyboardEvent) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			open = !open;
		}
	};

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	// Reset when closed
	$effect(() => {
		if (!open) {
			setTimeout(reset, 200);
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
		<Dialog.Header class="space-y-2 border-b border-border/40 pb-4">
			<div class="flex items-start justify-between gap-4">
				<PageHeader
					icon={PaperPlaneTilt}
					label="Dispatch"
					title="Run a Porter Task"
					description="Select a provider, model, repository, and issue to dispatch a new task."
				/>
				<Badge variant="secondary" class="text-[0.65rem] uppercase tracking-[0.22em]">
					New task
				</Badge>
			</div>
			<Dialog.Title class="sr-only">Run a Porter Task</Dialog.Title>
			<Dialog.Description class="sr-only">Dispatch task configuration dialog.</Dialog.Description>
		</Dialog.Header>

		<div class="custom-scrollbar flex-1 space-y-6 overflow-y-auto py-4 pr-1">
			<section class="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Step 1
						</p>
						<p class="text-sm font-semibold text-foreground">Choose provider and model</p>
						<p class="mt-1 text-xs text-muted-foreground">Pick a provider first, then choose a model.</p>
					</div>
					<Badge variant="outline" class="text-[0.65rem] uppercase tracking-[0.18em]">
						{providers.length} available
					</Badge>
				</div>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each providers as provider}
						<button
							type="button"
							onclick={() => selectProvider(provider.id)}
							class={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${selectedProviderId === provider.id ? 'border-primary/60 bg-primary/10 shadow-[0_6px_18px_rgba(15,23,42,0.08)]' : 'border-border/70 bg-background/60 hover:border-primary/40 hover:bg-muted/40'}`}
						>
							<img src={providerIconUrl(provider.domain)} alt={provider.label} class="h-5 w-5 rounded-sm border border-border/60" />
							<div class="flex-1">
								<p class="text-sm font-semibold">{provider.label}</p>
								<p class="text-xs text-muted-foreground">{provider.id}</p>
							</div>
							{#if selectedProviderId === provider.id}
								<Check size={16} weight="bold" class="text-primary" />
							{/if}
						</button>
					{/each}
				</div>

				{#if providerLoading}
					<p class="text-xs text-muted-foreground">Loading provider models...</p>
				{:else if providerError}
					<p class="text-xs text-destructive">{providerError}</p>
				{:else if selectedProviderId}
					<div class="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								{#if selectedProvider}
									<img src={providerIconUrl(selectedProvider.domain)} alt={selectedProvider.label} class="h-4 w-4 rounded-sm border border-border/60" />
								{/if}
								<p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Models</p>
							</div>
							<span class="text-xs text-muted-foreground">{selectedProviderModels.length} listed</span>
						</div>

						{#if recentModelsForSelectedProvider.length > 0}
							<div class="space-y-2">
								<p class="text-xs font-medium text-muted-foreground">Recent models</p>
								<div class="grid gap-2 sm:grid-cols-2">
									{#each recentModelsForSelectedProvider as model}
										<button
											type="button"
											onclick={() => (selectedModel = model.id)}
											class={`rounded-md border px-3 py-2 text-left text-sm transition ${selectedModel === model.id ? 'border-primary/60 bg-primary/10' : 'border-border/70 bg-background/70 hover:bg-muted/40'}`}
										>
											<p class="font-medium text-foreground">{model.name}</p>
											<p class="text-xs text-muted-foreground">{model.id}</p>
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<div class="space-y-2">
							<p class="text-xs font-medium text-muted-foreground">All available</p>
							{#if allModelsForSelectedProvider.length > 0}
								<div class="custom-scrollbar max-h-44 space-y-2 overflow-y-auto pr-1">
									{#each allModelsForSelectedProvider as model}
										<button
											type="button"
											onclick={() => (selectedModel = model.id)}
											class={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${selectedModel === model.id ? 'border-primary/60 bg-primary/10' : 'border-border/70 bg-background/70 hover:bg-muted/40'}`}
										>
											<p class="font-medium text-foreground">{model.name}</p>
											<p class="text-xs text-muted-foreground">{model.id}</p>
										</button>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-muted-foreground">No models found for this provider yet.</p>
							{/if}
						</div>
					</div>
				{/if}

				{#if !hasModels}
					<p class="text-xs text-muted-foreground">
						No providers are available yet. Add provider keys in
						<a href="/settings" class="ml-1 font-semibold underline">Settings</a>.
					</p>
				{/if}
			</section>

			<section class="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
				<div>
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Step 2</p>
					<p class="mt-1 text-sm font-semibold text-foreground">Pick repository and issue</p>
				</div>
				<div class="space-y-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="w-full">
							<div
								class={
									`flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background/90 px-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition ${repository ? 'text-foreground' : 'text-muted-foreground'}`
								}
							>
								<div class="flex items-center gap-2">
									<GitBranch size={16} class="text-muted-foreground" />
									<span>{repositoryLabel}</span>
								</div>
								<CaretDown size={14} class="text-muted-foreground" />
							</div>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-80 p-2">
							{#if repoLoading}
								<div class="px-2 py-2 text-xs text-muted-foreground">Loading repositories...</div>
							{:else if repoError}
								<div class="px-2 py-2 text-xs text-destructive">{repoError}</div>
							{:else if repositories.length === 0}
								<div class="px-2 py-2 text-xs text-muted-foreground">No repositories available.</div>
							{:else}
								<div class="custom-scrollbar max-h-64 overflow-y-auto pr-1">
									{#each repositories as repo}
										<DropdownMenu.Item onclick={() => (repository = repo.fullName)}>
											<div class="flex flex-col">
												<span class="text-sm font-medium text-foreground">{repo.fullName}</span>
												{#if repo.description}
													<span class="text-xs text-muted-foreground line-clamp-1">{repo.description}</span>
												{/if}
											</div>
										</DropdownMenu.Item>
									{/each}
								</div>
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<div class="flex items-center gap-3 pt-1">
						<span class="text-xs text-muted-foreground">Issue #</span>
						<input
							type="text"
							placeholder="optional"
							bind:value={issueNumber}
							class="h-7 w-24 rounded border border-border/70 bg-background/70 px-2 text-xs focus:border-primary/50 focus:outline-none"
						/>
						{#if issueNumber}
							<button
								type="button"
								onclick={() => issueNumber = ''}
								class="text-xs text-muted-foreground hover:text-foreground"
							>
								clear
							</button>
						{/if}
					</div>
				</div>
			</section>

			<section class="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
				<div>
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Step 3</p>
					<p class="mt-1 text-sm font-semibold text-foreground">What should Porter do?</p>
				</div>
				<textarea
					id="prompt"
					bind:value={customPrompt}
					placeholder={hasIssueNumber ? "Add extra instructions (optional)..." : "Describe the task you want Porter to complete..."}
					rows={hasIssueNumber ? 2 : 4}
					class="w-full rounded-lg border border-border/70 bg-background px-3 py-2.5 text-sm resize-y focus:border-primary/50 focus:outline-none"
				></textarea>
			</section>

			<section class="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
				<div class="flex items-center justify-between">
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Issue Preview</p>
					{#if issuePreview}
						<Badge variant={issuePreview.state === 'open' ? 'default' : 'secondary'} class="text-[0.65rem]">
							{issuePreview.state}
						</Badge>
					{/if}
				</div>
				{#if loadingIssue}
					<div class="rounded-lg bg-muted/30 p-3">
						<p class="text-sm text-muted-foreground">Loading...</p>
					</div>
				{:else if issuePreview}
					<div class="space-y-2">
						<a
							href={issuePreview.html_url}
							target="_blank"
							rel="noopener noreferrer"
							class="block text-sm font-medium hover:underline"
						>
							{issuePreview.title}
						</a>
						{#if issuePreview.labels.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each issuePreview.labels as label}
									<Badge variant="outline" class="text-[0.65rem]">
										{label.name}
									</Badge>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-xs text-muted-foreground">Enter an issue number above to see details here.</p>
				{/if}
			</section>

			<section class="space-y-3 rounded-2xl border border-border/60 bg-muted/25 p-4">
				<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Task settings</p>
				<RadioGroup.Root bind:value={priority} class="grid grid-cols-3 gap-2">
					<label class="cursor-pointer">
						<RadioGroup.Item value="low" class="peer sr-only" />
						<div class="rounded-md border border-border/70 px-3 py-2 text-center text-sm transition peer-data-[state=checked]:border-primary/60 peer-data-[state=checked]:bg-primary/10">Low</div>
					</label>
					<label class="cursor-pointer">
						<RadioGroup.Item value="normal" class="peer sr-only" />
						<div class="rounded-md border border-border/70 px-3 py-2 text-center text-sm transition peer-data-[state=checked]:border-primary/60 peer-data-[state=checked]:bg-primary/10">Normal</div>
					</label>
					<label class="cursor-pointer">
						<RadioGroup.Item value="high" class="peer sr-only" />
						<div class="rounded-md border border-border/70 px-3 py-2 text-center text-sm transition peer-data-[state=checked]:border-primary/60 peer-data-[state=checked]:bg-primary/10">High</div>
					</label>
				</RadioGroup.Root>
			</section>

			<section class="space-y-4 rounded-2xl border border-border/60 bg-muted/25 p-4">
				<div class="flex items-center gap-2">
					<Sparkle size={16} weight="bold" class="text-muted-foreground" />
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Quick actions</p>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium">Templates</p>
						<span class="text-xs text-muted-foreground">{COMMAND_TEMPLATES.length} presets</span>
					</div>
					<div class="grid gap-2">
						{#each COMMAND_TEMPLATES as template}
							<button
								type="button"
								onclick={() => useTemplate(template)}
								class="flex items-start gap-3 rounded-md border border-border/70 bg-background/60 p-2.5 text-left transition hover:bg-muted/40"
							>
								<div class="flex-1">
									<p class="text-sm font-medium">{template.name}</p>
									<p class="text-xs text-muted-foreground">{template.description}</p>
								</div>
								<Badge variant="outline" class="text-xs">{template.priority}</Badge>
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium">Recent commands</p>
						<span class="text-xs text-muted-foreground">Last 5</span>
					</div>
					{#if recentCommands.length > 0}
						<div class="custom-scrollbar max-h-44 space-y-2 overflow-y-auto pr-1">
							{#each recentCommands.slice(0, 5) as cmd}
								<button
									type="button"
									onclick={() => useRecentCommand(cmd)}
									class="flex w-full items-center gap-2 rounded-md border border-border/70 bg-background/60 p-2.5 text-left transition hover:bg-muted/40"
								>
									<div class="flex-1">
										<p class="text-sm font-medium">{cmd.repository}#{cmd.issue}</p>
										<p class="text-xs text-muted-foreground">{cmd.model}</p>
									</div>
									<span class="text-xs text-muted-foreground">{formatTimeAgo(cmd.timestamp)}</span>
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-muted-foreground">No recent dispatches yet.</p>
					{/if}
				</div>
			</section>

			<!-- Error Message -->
			{#if error}
				<div class="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex gap-2 border-t border-border/40 pt-4">
			<Button variant="outline" onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button onclick={handleSubmit} disabled={!isValid}>
				<Check size={14} />
				Run task
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
