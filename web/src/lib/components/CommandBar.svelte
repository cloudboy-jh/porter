<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowSquareOut,
		CaretDown,
		CaretUp,
		Check,
		Clock,
		Command,
		GitBranch,
		Sparkle,
		X
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
	let showRecent = $state(false);
	let showTemplates = $state(false);
	let showAdvanced = $state(false);

	// Derived
	const enabledAgents = $derived(agents.filter(a => a.enabled));
	const recentCommands = $derived(getRecentCommands());
	
	const getAgentIcon = (domain?: string) =>
		domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

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
		showRecent = false;
		showTemplates = false;
		showAdvanced = false;
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
		showRecent = false;
	};

	// Use template
	const useTemplate = (template: typeof COMMAND_TEMPLATES[0]) => {
		priority = template.priority;
		customPrompt = template.promptTemplate;
		showTemplates = false;
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
	<Dialog.Content class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Dispatch Task</Dialog.Title>
			<Dialog.Description>
				Select an agent and issue to dispatch a new task
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Agent Picker Grid -->
			<div class="space-y-2">
				<label class="text-sm font-medium">Select Agent</label>
				<div class="grid grid-cols-2 gap-2">
					{#each enabledAgents as agent}
						<button
							type="button"
							onclick={() => selectedAgent = agent.name}
							class="flex items-center gap-3 rounded-lg border-2 p-3 transition hover:bg-muted/50 {selectedAgent === agent.name ? 'border-primary bg-primary/5' : 'border-border'}"
						>
							{#if agent.domain}
								<img 
									class="h-8 w-8 rounded-md" 
									src={getAgentIcon(agent.domain)} 
									alt={agent.name}
								/>
							{/if}
							<div class="flex-1 text-left">
								<p class="font-medium capitalize text-sm">{agent.name}</p>
								<p class="text-xs text-muted-foreground">
									{agent.taskCount || 0} tasks • {agent.successRate || 0}%
								</p>
							</div>
							{#if selectedAgent === agent.name}
								<Check size={16} class="text-primary" />
							{/if}
						</button>
					{/each}
				</div>
				{#if enabledAgents.length === 0}
					<p class="text-xs text-muted-foreground">No agents enabled. Enable agents in settings.</p>
				{/if}
			</div>

			<Separator />

			<!-- Repository Input -->
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

			<!-- Issue Number Input -->
			<div class="space-y-2">
				<label for="issue" class="text-sm font-medium">Issue Number</label>
				<Input
					id="issue"
					type="text"
					placeholder="123"
					bind:value={issueNumber}
				/>
			</div>

			<!-- Issue Preview -->
			{#if loadingIssue}
				<div class="rounded-lg border border-border bg-muted/40 p-4">
					<p class="text-sm text-muted-foreground">Loading issue details...</p>
				</div>
			{:else if issuePreview}
				<div class="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
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
			{/if}

			<!-- Advanced Options (Collapsible) -->
			<button
				type="button"
				onclick={() => showAdvanced = !showAdvanced}
				class="flex items-center justify-between w-full text-sm font-medium py-2"
			>
				Advanced Options
				{#if showAdvanced}
					<CaretUp size={16} weight="bold" />
				{:else}
					<CaretDown size={16} weight="bold" />
				{/if}
			</button>

			{#if showAdvanced}
				<div class="space-y-4 pl-4 border-l-2 border-border">
					<!-- Priority Selector -->
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

					<!-- Custom Prompt -->
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

			<!-- Templates (Collapsible) -->
			<button
				type="button"
				onclick={() => showTemplates = !showTemplates}
				class="flex items-center gap-2 text-sm font-medium py-2"
			>
				<Sparkle size={16} weight="bold" />
				Use Template
				{#if showTemplates}
					<CaretUp size={16} weight="bold" class="ml-auto" />
				{:else}
					<CaretDown size={16} weight="bold" class="ml-auto" />
				{/if}
			</button>

			{#if showTemplates}
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
			{/if}

			<!-- Recent Commands (Collapsible) -->
			{#if recentCommands.length > 0}
				<button
					type="button"
					onclick={() => showRecent = !showRecent}
					class="flex items-center gap-2 text-sm font-medium py-2"
				>
					<Clock size={16} />
					Recent Commands
					{#if showRecent}
					<CaretUp size={16} weight="bold" class="ml-auto" />
					{:else}
					<CaretDown size={16} weight="bold" class="ml-auto" />
					{/if}
				</button>

				{#if showRecent}
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
				{/if}
			{/if}

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
