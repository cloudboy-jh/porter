<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowSquareOut,
		CaretDown,
		CaretUp,
		Check,
		Clock,
		GitBranch,
		Sparkle
	} from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import type { AgentConfig, ParsedCommand, GitHubIssue } from '$lib/types/agent';
	import { COMMAND_TEMPLATES } from '$lib/constants/command-templates';
	import { getRecentCommands, addRecentCommand, formatTimeAgo } from '$lib/utils/command-storage';

	type AgentDisplay = AgentConfig & {
		readyState?: 'ready' | 'missing_credentials' | 'disabled';
		displayName?: string;
	};

	let {
		open = $bindable(false),
		agents = [] as AgentDisplay[],
		onsubmit
	}: {
		open?: boolean;
		agents?: AgentDisplay[];
		onsubmit?: (payload: ParsedCommand) => void;
	} = $props();

	// State
	let selectedAgent = $state<string>('');
	let repository = $state('');
	let issueNumber = $state('');
	let priority = $state('normal');
	let customPrompt = $state('');
	let error = $state('');
	let issuePreview = $state<GitHubIssue | null>(null);
	let loadingIssue = $state(false);
	let showAdvanced = $state(false);
	let showExtras = $state(false);
	let repositories = $state<Array<{ id: number; fullName: string; description: string | null }>>([]);
	let repoLoading = $state(false);
	let repoError = $state('');

	// Derived
	const readyAgents = $derived(
		agents.filter((agent) => (agent.readyState ? agent.readyState === 'ready' : agent.enabled))
	);
	const hasReadyAgents = $derived(readyAgents.length > 0);
	const recentCommands = $derived(getRecentCommands());
	const repositoryLabel = $derived(repository || 'Select repository');
	
	const getAgentIcon = (domain?: string) =>
		domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

	const getStatusTone = (status?: string) => {
		switch (status) {
			case 'active':
				return 'bg-emerald-500';
			case 'idle':
				return 'bg-amber-500';
			case 'error':
				return 'bg-destructive';
			case 'disabled':
				return 'bg-muted-foreground/50';
			default:
				return 'bg-muted-foreground/40';
		}
	};

	const hasIssueNumber = $derived(/^\d+$/.test(issueNumber));
	const hasPrompt = $derived(customPrompt.trim().length > 0);
	const isValid = $derived(
		selectedAgent &&
		repository &&
		/^[\w.-]+\/[\w.-]+$/.test(repository) &&
		(hasIssueNumber || hasPrompt)
	);

	// Reset form
	const reset = () => {
		selectedAgent = '';
		repository = '';
		issueNumber = '';
		priority = 'normal';
		customPrompt = '';
		error = '';
		issuePreview = null;
		showAdvanced = false;
		showExtras = false;
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
				repoError = 'Repositories unavailable.';
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
		const payload: ParsedCommand = {
			agent: selectedAgent,
			repoOwner: owner,
			repoName: repo,
			issueNumber: hasIssueNumber ? parseInt(issueNumber) : 0,
			priority,
			prompt: customPrompt
		};

		// Save to recent commands
		if (hasIssueNumber) {
			addRecentCommand({
				agent: selectedAgent,
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
		selectedAgent = cmd.agent;
		repository = cmd.repository;
		issueNumber = cmd.issue.toString();
		priority = cmd.priority;
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
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
		<Dialog.Header class="space-y-2">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
						Dispatch
					</p>
					<Dialog.Title class="text-2xl font-semibold text-foreground">Run a Porter task</Dialog.Title>
				</div>
				<Badge variant="secondary" class="text-[0.65rem] uppercase tracking-[0.22em]">
					New task
				</Badge>
			</div>
			<Dialog.Description class="text-sm text-muted-foreground">
				Select an agent, repository, and issue to dispatch a new task.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<section class="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-5">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Agents
						</p>
						<p class="text-sm font-semibold text-foreground">Choose who runs the task</p>
					</div>
				<Badge variant="outline" class="text-[0.65rem] uppercase tracking-[0.18em]">
					{readyAgents.length} ready
				</Badge>
			</div>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each readyAgents as agent}
					<button
							type="button"
							onclick={() => selectedAgent = agent.name}
							class="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 p-3 text-left transition hover:border-primary/40 hover:bg-muted/40 {selectedAgent === agent.name ? 'border-primary/60 bg-primary/10 shadow-[0_6px_18px_rgba(15,23,42,0.08)]' : ''}"
						>
							{#if agent.domain}
								<img
									class="h-9 w-9 rounded-md border border-border/60"
									src={getAgentIcon(agent.domain)}
									alt={agent.name}
								/>
							{/if}
							<div class="flex-1">
								<div class="flex items-center justify-between gap-2">
							<p class="text-sm font-semibold capitalize">
								{agent.displayName ?? agent.name}
							</p>
									{#if agent.status}
										<span class="flex items-center gap-1 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
											<span class={`h-1.5 w-1.5 rounded-full ${getStatusTone(agent.status)}`}></span>
											{agent.status}
										</span>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground">
									{agent.taskCount || 0} tasks • {agent.successRate || 0}% success
								</p>
								<div class="mt-2 flex flex-wrap items-center gap-2 text-[0.6rem]">
									<Badge variant="outline" class="text-[0.55rem] uppercase tracking-[0.2em]">
										Priority {agent.priority}
									</Badge>
									{#if agent.version}
										<Badge variant="outline" class="text-[0.55rem] uppercase tracking-[0.2em]">
											v{agent.version}
										</Badge>
									{/if}
									<span class="text-[0.65rem] text-muted-foreground">
										{agent.lastUsed ?? 'No recent runs'}
									</span>
								</div>
							</div>
							{#if selectedAgent === agent.name}
								<Check size={16} weight="bold" class="text-primary" />
							{/if}
						</button>
					{/each}
				</div>
			{#if !hasReadyAgents}
				<p class="text-xs text-muted-foreground">
					No agents are ready to run. Add credentials and enable agents in
					<a href="/settings" class="ml-1 font-semibold underline">Settings</a>.
				</p>
			{/if}
		</section>

			<section class="grid gap-4 rounded-2xl border border-border/60 bg-background/70 p-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<div class="space-y-2">
					<label class="text-sm font-medium">Repository</label>
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
								<div class="max-h-64 overflow-y-auto">
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
					<p class="text-xs text-muted-foreground">Select a repository to target.</p>
				</div>
				<div class="space-y-2">
					<label for="issue" class="text-sm font-medium">Issue Number (Optional)</label>
					<Input
						id="issue"
						type="text"
						placeholder="123"
						bind:value={issueNumber}
					/>
					<p class="text-xs text-muted-foreground">Leave empty to create a new issue from your prompt.</p>
				</div>
			</section>

			<section class="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-5">
				<label for="prompt" class="text-sm font-medium">Issue Prompt</label>
				<textarea
					id="prompt"
					bind:value={customPrompt}
					placeholder="Describe the task Porter should run..."
					rows="3"
					class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
				></textarea>
				<p class="text-xs text-muted-foreground">Required when no issue number is provided.</p>
			</section>

			<section class="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-5">
				<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
					Issue Preview
				</p>
				{#if loadingIssue}
					<div class="rounded-lg border border-border bg-muted/40 p-4">
						<p class="text-sm text-muted-foreground">Loading issue details...</p>
					</div>
				{:else if issuePreview}
					<div class="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<h4 class="font-medium text-sm">{issuePreview.title}</h4>
								<p class="text-xs text-muted-foreground mt-1 line-clamp-2">
									{issuePreview.body}
								</p>
							</div>
							<Badge variant={issuePreview.state === 'open' ? 'default' : 'secondary'}>
								{issuePreview.state}
							</Badge>
						</div>
						{#if issuePreview.labels.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each issuePreview.labels as label}
									<Badge variant="outline" class="text-xs">
										{label.name}
									</Badge>
								{/each}
							</div>
						{/if}
						<a
							href={issuePreview.html_url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
						>
							View on GitHub
							<ArrowSquareOut size={12} weight="bold" />
						</a>
					</div>
				{:else}
					<div class="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4">
						<p class="text-xs text-muted-foreground">Enter a repo and issue to preview the task.</p>
					</div>
				{/if}
			</section>

			<section class="rounded-2xl border border-border/60 bg-muted/30 p-4">
				<button
					type="button"
					onclick={() => showAdvanced = !showAdvanced}
					class="flex w-full items-center justify-between text-sm font-medium"
				>
					Advanced Options
					{#if showAdvanced}
						<CaretUp size={16} weight="bold" />
					{:else}
						<CaretDown size={16} weight="bold" />
					{/if}
				</button>
				{#if showAdvanced}
					<div class="mt-4 space-y-4">
						<div class="space-y-2">
							<label class="text-sm font-medium">Priority</label>
							<RadioGroup.Root bind:value={priority} class="flex gap-2">
								<label class="flex-1 cursor-pointer">
									<RadioGroup.Item value="low" class="peer sr-only" />
									<div class="rounded-md border-2 border-border px-3 py-2 text-center text-sm peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
										Low
									</div>
								</label>
								<label class="flex-1 cursor-pointer">
									<RadioGroup.Item value="normal" class="peer sr-only" />
									<div class="rounded-md border-2 border-border px-3 py-2 text-center text-sm peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
										Normal
									</div>
								</label>
								<label class="flex-1 cursor-pointer">
									<RadioGroup.Item value="high" class="peer sr-only" />
									<div class="rounded-md border-2 border-border px-3 py-2 text-center text-sm peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
										High
									</div>
								</label>
							</RadioGroup.Root>
						</div>
					</div>
				{/if}
			</section>

			<section class="rounded-2xl border border-border/60 bg-muted/30 p-4">
				<button
					type="button"
					onclick={() => showExtras = !showExtras}
					class="flex w-full items-center justify-between text-sm font-medium"
				>
					<div class="flex items-center gap-2">
						<Sparkle size={16} weight="bold" />
						Templates + Recent
					</div>
					{#if showExtras}
						<CaretUp size={16} weight="bold" />
					{:else}
						<CaretDown size={16} weight="bold" />
					{/if}
				</button>
				{#if showExtras}
					<div class="mt-4 space-y-4">
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Templates</p>
								<span class="text-xs text-muted-foreground">{COMMAND_TEMPLATES.length} presets</span>
							</div>
							<div class="grid gap-2">
								{#each COMMAND_TEMPLATES as template}
									<button
										type="button"
										onclick={() => useTemplate(template)}
										class="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-muted/50"
									>
										<Sparkle size={16} weight="bold" class="mt-0.5 text-muted-foreground" />
										<div class="flex-1">
											<p class="font-medium text-sm">{template.name}</p>
											<p class="text-xs text-muted-foreground">{template.description}</p>
										</div>
										<Badge variant="outline" class="text-xs">
											{template.priority}
										</Badge>
									</button>
								{/each}
							</div>
						</div>
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recent Commands</p>
								<span class="text-xs text-muted-foreground">Last 5</span>
							</div>
							{#if recentCommands.length > 0}
								<div class="grid gap-2">
									{#each recentCommands.slice(0, 5) as cmd}
										<button
											type="button"
											onclick={() => useRecentCommand(cmd)}
											class="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-muted/50"
										>
											<div class="flex-1">
												<div class="flex items-center gap-2">
													<Badge variant="secondary" class="text-xs capitalize">{cmd.agent}</Badge>
													<span class="text-sm font-medium">{cmd.repository}#{cmd.issue}</span>
												</div>
												{#if cmd.issueTitle}
													<p class="text-xs text-muted-foreground mt-1">{cmd.issueTitle}</p>
												{/if}
											</div>
											<span class="text-xs text-muted-foreground">
												{formatTimeAgo(cmd.timestamp)}
											</span>
										</button>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-muted-foreground">No recent dispatches yet.</p>
							{/if}
						</div>
					</div>
				{/if}
			</section>

			<!-- Error Message -->
			{#if error}
				<div class="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex gap-2">
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
