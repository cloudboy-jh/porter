<script lang="ts">
	import { ArrowUpRight, FolderGit2, Github, GitBranch, RotateCcw, Square } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import GitDiffBadge from '$lib/components/GitDiffBadge.svelte';
	import type { Task } from '$lib/types/task';

	export let tasks: Task[] = [];
	export let onToggleExpanded: (id: string) => void = () => undefined;
	export let onStop: (id: string) => void = () => undefined;
	export let onRestart: (id: string) => void = () => undefined;
	export let highlightStatus: Task['status'] | null = null;

	const agentDomains: Record<string, string> = {
		opencode: 'opencode.ai',
		claude: 'claude.ai',
		cursor: 'cursor.com',
		windsurf: 'windsurf.com',
		cline: 'github.com/cline',
		aider: 'aider.chat'
	};

	const getAgentIcon = (agent: string) =>
		`https://www.google.com/s2/favicons?domain=${agentDomains[agent] ?? 'github.com'}&sz=64`;

	const getIssueNumber = (issue: string) => (issue.startsWith('#') ? issue.slice(1) : issue);

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
		running: 'border-amber-400/70 bg-amber-500/15 text-amber-200',
		queued: 'border-slate-500/55 bg-slate-500/15 text-slate-200',
		success: 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200',
		failed: 'border-rose-400/70 bg-rose-500/15 text-rose-200'
	};

	const nodeGlow: Record<Task['status'], string> = {
		running: 'shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_0_20px_rgba(251,191,36,0.45)]',
		queued: 'shadow-[0_0_0_3px_rgba(148,163,184,0.16),0_0_16px_rgba(148,163,184,0.3)]',
		success: 'shadow-[0_0_0_3px_rgba(52,211,153,0.18),0_0_20px_rgba(52,211,153,0.45)]',
		failed: 'shadow-[0_0_0_3px_rgba(251,113,133,0.18),0_0_20px_rgba(251,113,133,0.45)]'
	};

	const lineGlow: Record<Task['status'], string> = {
		running: 'bg-gradient-to-b from-amber-400/70 via-amber-400/45 to-transparent',
		queued: 'bg-gradient-to-b from-slate-400/55 via-slate-400/30 to-transparent',
		success: 'bg-gradient-to-b from-emerald-400/70 via-emerald-400/45 to-transparent',
		failed: 'bg-gradient-to-b from-rose-400/70 via-rose-400/45 to-transparent'
	};

	const isHighlighted = (task: Task) =>
		task.status === 'running' || (highlightStatus && task.status === highlightStatus);
</script>

<div class="mt-2 max-h-[80vh] overflow-y-auto pr-1 hide-scrollbar">
	<div class="relative">
		<div class="pointer-events-none absolute left-5 top-0 h-full w-0.5 bg-gradient-to-b from-border/80 via-border/70 to-transparent"></div>
		<div class="space-y-8">
			{#each tasks as task}
				<div class="relative pl-10">
					{#if isHighlighted(task)}
						<span class={`pointer-events-none absolute left-5 top-2 h-[calc(100%-0.75rem)] w-0.5 ${lineGlow[task.status]}`}></span>
					{/if}
					<div
						class={`absolute left-3 top-6 flex h-4 w-4 items-center justify-center rounded-[6px] border ${nodeStyles[task.status]} ${isHighlighted(task) ? nodeGlow[task.status] : ''} ${task.status === 'running' ? 'animate-[pulse_4.32s_ease-in-out_infinite]' : ''}`}
					>
						<span class="h-1.5 w-1.5 rounded-[3px] bg-current/80"></span>
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
								<span class="font-medium text-foreground/80">{task.repo}</span>
								<span class="text-muted-foreground/60">&bull;</span>
								<span class="flex items-center gap-2 capitalize">
									<img class="h-4 w-4 rounded-sm" src={getAgentIcon(task.agent)} alt="" />
									{task.agent}
								</span>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<div class="text-base font-semibold text-foreground">{task.title}</div>
								{#if task.status === 'failed'}
									<Badge
										variant="outline"
										class="border-rose-500/50 bg-rose-500/10 text-[10px] uppercase text-rose-400"
									>
										Failed
									</Badge>
								{/if}
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
										href={`https://github.com/jackgolding/${task.repo}/issues/${getIssueNumber(task.issue)}`}
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
										View
									</Button>
									{#if task.status === 'failed'}
										<Button
											variant="ghost"
											size="sm"
											onclick={(event: MouseEvent) => handleRestartClick(event, task.id)}
										>
											Retry
										</Button>
									{/if}
									{#if task.status === 'running' || task.status === 'queued'}
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
											<FolderGit2 size={14} class="text-muted-foreground" />
											jackgolding/{task.repo}
										</p>
									</div>
									<div>
										<p class="text-xs uppercase text-muted-foreground">Branch</p>
										<p class="flex items-center gap-2 text-sm font-medium">
											<GitBranch size={14} class="text-muted-foreground" />
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
										<Square size={14} />
										Stop
									</Button>
									<Button
										variant="secondary"
										size="sm"
										onclick={(event: MouseEvent) => handleRestartClick(event, task.id)}
									>
										<RotateCcw size={14} />
										Restart
									</Button>
						<Button
							variant="secondary"
							size="sm"
							class="gap-2"
							onclick={() => {
								window.open(
									`https://github.com/jackgolding/${task.repo}/issues/${task.issue.slice(1)}`,
									'_blank'
								);
							}}
						>
							<Github size={14} />
							<ArrowUpRight size={14} />
							View in GitHub
						</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
