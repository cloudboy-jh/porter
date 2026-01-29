<script lang="ts">
	import {
		ArrowCounterClockwise,
		ArrowUpRight,
		Folder,
		GithubLogo,
		GitBranch,
		Square
	} from 'phosphor-svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import GitDiffBadge from '$lib/components/GitDiffBadge.svelte';
	import type { Task } from '$lib/types/task';

	type TaskWithLinks = Task & { repoOwner?: string; issueUrl?: string };

	export let tasks: TaskWithLinks[] = [];
	export let onToggleExpanded: (id: string) => void = () => undefined;
	export let onStop: (id: string) => void = () => undefined;
	export let onRestart: (id: string) => void = () => undefined;
	export let highlightStatus: Task['status'] | null = null;
	export let primaryActionLabel = 'View';
	export let showStatusActions = true;

	const agentDomains: Record<string, string> = {
		opencode: 'opencode.ai',
		'claude-code': 'claude.ai',
		amp: 'anthropic.com'
	};

	const getAgentIcon = (agent: string) =>
		`https://www.google.com/s2/favicons?domain=${agentDomains[agent] ?? 'github.com'}&sz=64`;

	const getIssueNumber = (issue: string) => (issue.startsWith('#') ? issue.slice(1) : issue);
	const getIssueUrl = (task: TaskWithLinks) =>
		task.issueUrl ??
		(task.repoOwner
			? `https://github.com/${task.repoOwner}/${task.repo}/issues/${getIssueNumber(task.issue)}`
			: `https://github.com/${task.repo}/issues/${getIssueNumber(task.issue)}`);

	const handleRowKey = (event: KeyboardEvent, id: string) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onToggleExpanded(id);
		}
	};

	const handleViewClick = (event: MouseEvent, id: string) => {
		event.stopPropagation();
		onToggleExpanded(id);
	};

	const handleStopClick = (event: MouseEvent, id: string) => {
		event.stopPropagation();
		onStop(id);
	};

	const handleRestartClick = (event: MouseEvent, id: string) => {
		event.stopPropagation();
		onRestart(id);
	};

	const nodeStyles: Record<Task['status'], string> = {
		running: 'border-primary/60 bg-primary/10 text-primary',
		queued: 'border-border/70 bg-muted text-muted-foreground',
		success: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600',
		failed: 'border-rose-500/60 bg-rose-500/10 text-rose-600'
	};

	const highlightRing: Record<Task['status'], string> = {
		running: 'ring-2 ring-primary/15',
		queued: 'ring-2 ring-border/40',
		success: 'ring-2 ring-emerald-500/15',
		failed: 'ring-2 ring-rose-500/15'
	};

	const lineGlow: Record<Task['status'], string> = {
		running: 'bg-primary/40',
		queued: 'bg-border/60',
		success: 'bg-emerald-500/40',
		failed: 'bg-rose-500/40'
	};

	const statusBadge: Record<Task['status'], { label: string; className: string }> = {
		running: {
			label: 'Running',
			className: 'border-primary/30 bg-primary/10 text-primary'
		},
		queued: {
			label: 'Queued',
			className: 'border-border/60 bg-muted/70 text-muted-foreground'
		},
		success: {
			label: 'Done',
			className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
		},
		failed: {
			label: 'Failed',
			className: 'border-rose-500/30 bg-rose-500/10 text-rose-600'
		}
	};

	const isHighlighted = (task: TaskWithLinks) =>
		task.status === 'running' || (highlightStatus && task.status === highlightStatus);
</script>

<div class="mt-2 max-h-[80vh] overflow-y-auto pr-1 hide-scrollbar">
		<div class="relative">
			{#if tasks.length === 0}
				<div class="rounded-2xl border border-border/60 bg-background/70 p-10 text-center">
					<p class="text-sm font-semibold text-foreground">No active tasks yet</p>
					<p class="mt-2 text-xs text-muted-foreground">
						Start by dispatching a task from the command bar.
					</p>
				</div>
			{:else}
				<div class="pointer-events-none absolute left-5 top-0 h-full w-0.5 bg-gradient-to-b from-border/80 via-border/50 to-transparent"></div>
				<div class="space-y-8">
					{#each tasks as task}
						<div class="relative pl-10">
							{#if isHighlighted(task)}
								<span class={`pointer-events-none absolute left-5 top-2 h-[calc(100%-0.75rem)] w-0.5 ${lineGlow[task.status]}`}></span>
							{/if}
							<div
								class={`absolute left-3 top-6 flex h-4 w-4 items-center justify-center rounded-[6px] border ${nodeStyles[task.status]} ${isHighlighted(task) ? highlightRing[task.status] : ''}`}
							>
								<span class="h-1.5 w-1.5 rounded-[3px] bg-current/70"></span>
							</div>
							<Card.Root
								class={`group task-card task-card--${task.status} rounded-2xl border border-border/60 bg-background/80 ${task.expanded ? 'is-expanded' : ''}`}
								style={`--task-progress: ${task.progress}%`}
								role="button"
								tabindex={0}
								onclick={() => onToggleExpanded(task.id)}
								onkeydown={(event: KeyboardEvent) => handleRowKey(event, task.id)}
							>
								<Card.Content class="space-y-3 p-5">
									<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<span class="font-medium text-foreground/80">
										{task.repoOwner ? `${task.repoOwner}/${task.repo}` : task.repo}
									</span>
										<span class="text-muted-foreground/60">&bull;</span>
										<span class="flex items-center gap-2 capitalize">
											<img class="h-4 w-4 rounded-sm" src={getAgentIcon(task.agent)} alt="" />
											{task.agent}
										</span>
									</div>
									<div class="flex flex-wrap items-center gap-2">
										<div class="text-base font-semibold text-foreground">{task.title}</div>
										<Badge
											variant="outline"
											class={`text-[10px] uppercase ${statusBadge[task.status].className}`}
										>
											{statusBadge[task.status].label}
										</Badge>
									</div>
									<div class="text-sm text-muted-foreground">
										{task.technicalSummary ?? 'Summary pending.'}
									</div>
									<div class="flex flex-wrap items-center gap-3">
										<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
											<GitDiffBadge variant="add" value={task.git?.add ?? 0} />
											<GitDiffBadge variant="remove" value={task.git?.remove ?? 0} />
											<span class="text-muted-foreground/60">&bull;</span>
											{#if task.prUrl}
												<a
													class="text-primary hover:text-primary/80"
													href={task.prUrl}
													target="_blank"
													rel="noreferrer"
												>
													PR #{task.prNumber ?? '-'}
												</a>
											{:else}
												<span>PR -</span>
											{/if}
											<span class="text-muted-foreground/60">&bull;</span>
											<span>{task.commitHash ?? 'commit -'}</span>
											<span class="text-muted-foreground/60">&bull;</span>
										<a
											class="text-primary hover:text-primary/80"
											href={getIssueUrl(task)}
											target="_blank"
											rel="noreferrer"
										>
											{task.issue}
										</a>
											<span class="text-muted-foreground/60">&bull;</span>
											<span>{task.started}</span>
										</div>
									<div class="task-actions flex items-center gap-2 md:ml-auto">
										<Button variant="ghost" size="sm" onclick={(event: MouseEvent) => handleViewClick(event, task.id)}>
											{primaryActionLabel}
										</Button>
										{#if showStatusActions && task.status === 'failed'}
											<Button
												variant="ghost"
												size="sm"
												onclick={(event: MouseEvent) => handleRestartClick(event, task.id)}
											>
												Retry
											</Button>
										{/if}
										{#if showStatusActions && (task.status === 'running' || task.status === 'queued')}
											<Button
												variant="ghost"
												size="sm"
												onclick={(event: MouseEvent) => handleStopClick(event, task.id)}
											>
												Cancel
											</Button>
										{/if}
									</div>
									</div>
								</Card.Content>
							</Card.Root>

					{#if task.expanded}
						<Card.Root class="border border-border/60 bg-background/70">
							<Card.Content class="space-y-4 p-4">
								<div class="grid gap-4 md:grid-cols-6">
									<div>
										<p class="text-xs uppercase text-muted-foreground">Issue</p>
										<p class="text-sm font-medium">{task.issue}</p>
									</div>
									<div>
										<p class="text-xs uppercase text-muted-foreground">Repository</p>
										<p class="flex items-center gap-2 text-sm font-medium">
											<Folder size={14} weight="bold" class="text-muted-foreground" />
											{task.repoOwner ? `${task.repoOwner}/${task.repo}` : task.repo}
										</p>
									</div>
									<div>
										<p class="text-xs uppercase text-muted-foreground">Branch</p>
										<p class="flex items-center gap-2 text-sm font-medium">
									<GitBranch size={14} weight="bold" class="text-muted-foreground" />
											{task.branch ?? 'main'}
										</p>
									</div>
									<div>
										<p class="text-xs uppercase text-muted-foreground">Agent</p>
										<p class="flex items-center gap-2 text-sm font-medium">
											<img class="h-4 w-4 rounded-sm" src={getAgentIcon(task.agent)} alt="" />
											{task.agent}
										</p>
									</div>
									<div>
										<p class="text-xs uppercase text-muted-foreground">Git</p>
										<div class="flex flex-wrap items-center gap-2">
											<GitDiffBadge variant="add" value={task.git?.add ?? 0} />
											<GitDiffBadge variant="remove" value={task.git?.remove ?? 0} />
										</div>
									</div>
									<div>
										<p class="text-xs uppercase text-muted-foreground">Started</p>
										<p class="text-sm font-medium">{task.started}</p>
									</div>
								</div>

								<Card.Root>
									<Card.Header class="pb-2">
										<Card.Title class="text-sm">Task Logs</Card.Title>
									</Card.Header>
									<Card.Content class="space-y-2 text-xs">
										{#each task.logs as log}
											<div class="grid grid-cols-[70px_80px_1fr] items-center gap-3 font-mono text-muted-foreground">
												<span>{log.time}</span>
												<span class="font-semibold uppercase text-foreground">{log.level}</span>
												<span>{log.message}</span>
											</div>
										{/each}
									</Card.Content>
								</Card.Root>

								<div class="flex flex-wrap gap-2">
									<Button
										variant="destructive"
										size="sm"
										onclick={(event: MouseEvent) => handleStopClick(event, task.id)}
									>
									<Square size={14} weight="bold" />
										Stop
									</Button>
									<Button
										variant="secondary"
										size="sm"
										onclick={(event: MouseEvent) => handleRestartClick(event, task.id)}
									>
									<ArrowCounterClockwise size={14} weight="bold" />
										Restart
									</Button>
										<Button
											variant="secondary"
											size="sm"
											class="gap-2"
											href={getIssueUrl(task)}
											target="_blank"
											rel="noreferrer"
											disabled={!getIssueUrl(task)}
										>
											<GithubLogo size={14} weight="bold" />
											<ArrowUpRight size={14} weight="bold" />
											View in GitHub
										</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				</div>
					{/each}
				</div>
			{/if}
		</div>
</div>
