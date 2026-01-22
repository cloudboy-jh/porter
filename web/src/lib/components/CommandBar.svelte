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
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import type { AgentConfig, ParsedCommand, GitHubIssue } from '$lib/types/agent';
	import { COMMAND_TEMPLATES } from '$lib/constants/command-templates';
	import { getRecentCommands, addRecentCommand, formatTimeAgo } from '$lib/utils/command-storage';

	let { 
		open = $bindable(false), 
		agents = [] as AgentConfig[],
		onsubmit
	}: {
		open?: boolean;
		agents?: AgentConfig[];
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

	// Derived
	const enabledAgents = $derived(agents.filter(a => a.enabled));
	const recentCommands = $derived(getRecentCommands());
	
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

	const isValid = $derived(
		selectedAgent && 
		repository && 
		issueNumber && 
		/^[\w.-]+\/[\w.-]+$/.test(repository) &&
		/^\d+$/.test(issueNumber)
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

	// Fetch issue preview
	const fetchIssuePreview = async () => {
		if (!repository || !issueNumber) return;
		
		const match = repository.match(/^([\w.-]+)\/([\w.-]+)$/);
		if (!match) return;

		loadingIssue = true;
		error = '';

		try {
			// Mock GitHub API call - replace with real API later
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Mock data
			issuePreview = {
				number: parseInt(issueNumber),
				title: `Sample Issue #${issueNumber}`,
				body: 'This is a mock issue description. Replace with real GitHub API call.',
				state: 'open',
				labels: [
					{ name: 'bug', color: 'ef4444' },
					{ name: 'high-priority', color: 'f59e0b' }
				],
				html_url: `https://github.com/${repository}/issues/${issueNumber}`
			};
		} catch (err) {
			error = 'Failed to fetch issue details';
			issuePreview = null;
		} finally {
			loadingIssue = false;
		}
	};

	// Watch for issue changes
	$effect(() => {
		if (repository && issueNumber && /^\d+$/.test(issueNumber)) {
			fetchIssuePreview();
		} else {
			issuePreview = null;
		}
	});

	// Handle submit
	const handleSubmit = () => {
		if (!isValid) {
			error = 'Please fill in all required fields';
			return;
		}

		const [owner, repo] = repository.split('/');
		const payload: ParsedCommand = {
			agent: selectedAgent,
			repoOwner: owner,
			repoName: repo,
			issueNumber: parseInt(issueNumber),
			priority,
			prompt: customPrompt
		};

		// Save to recent commands
		addRecentCommand({
			agent: selectedAgent,
			repository,
			issue: parseInt(issueNumber),
			issueTitle: issuePreview?.title,
			priority
		});

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
	<Dialog.Content class="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Dispatch Task</Dialog.Title>
			<Dialog.Description>
				Select an agent and issue to dispatch a new task
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<section class="space-y-3">
				<div class="flex items-center justify-between gap-4">
					<div>
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Agents
						</p>
						<p class="text-sm font-semibold text-foreground">Choose who runs the task</p>
					</div>
					<Badge variant="outline" class="text-[0.65rem] uppercase tracking-[0.18em]">
						{enabledAgents.length} enabled
					</Badge>
				</div>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each enabledAgents as agent}
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
									<p class="text-sm font-semibold capitalize">{agent.name}</p>
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
				{#if enabledAgents.length === 0}
					<p class="text-xs text-muted-foreground">No agents enabled. Enable agents in settings.</p>
				{/if}
			</section>

			<Separator />

			<section class="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<div class="space-y-2">
					<label for="repository" class="text-sm font-medium">Repository</label>
					<div class="relative">
						<GitBranch size={16} class="absolute left-3 top-3 text-muted-foreground" />
						<Input
							id="repository"
							type="text"
							placeholder="owner/repo"
							bind:value={repository}
							class="pl-9"
						/>
					</div>
					<p class="text-xs text-muted-foreground">Format: owner/repository</p>
				</div>
				<div class="space-y-2">
					<label for="issue" class="text-sm font-medium">Issue Number</label>
					<Input
						id="issue"
						type="text"
						placeholder="123"
						bind:value={issueNumber}
					/>
					<p class="text-xs text-muted-foreground">GitHub issue ID</p>
				</div>
			</section>

			<section class="space-y-2">
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

			<section class="rounded-lg border border-border/60 bg-muted/30 p-3">
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
						<div class="space-y-2">
							<label for="prompt" class="text-sm font-medium">Custom Prompt (Optional)</label>
							<textarea
								id="prompt"
								bind:value={customPrompt}
								placeholder="Additional instructions for the agent..."
								rows="3"
								class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
							></textarea>
						</div>
					</div>
				{/if}
			</section>

			<section class="rounded-lg border border-border/60 bg-muted/30 p-3">
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
				<div class="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
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
				Dispatch Task
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
