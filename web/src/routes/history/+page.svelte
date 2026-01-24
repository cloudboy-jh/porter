<script lang="ts">
	import {
		ArrowCounterClockwise,
		ArrowUpRight,
		CaretDown,
		CaretUp,
		CheckCircle,
		Clock,
		DownloadSimple,
		GitBranch,
		GitCommit,
		GitPullRequest,
		MagnifyingGlass,
		Percent,
		Robot,
		WarningCircle,
		X
	} from 'phosphor-svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import DateFilterButton from '$lib/components/DateFilterButton.svelte';
	import GitFilterButton from '$lib/components/GitFilterButton.svelte';
	import type { PageData } from './$types';
	import type { Task } from '$lib/server/types';

	type TaskWithLinks = Task & { issueUrl?: string; prUrl?: string; branch?: string };

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

	const statusStyles: Record<string, string> = {
		queued: 'border border-border/60 bg-muted/70 text-muted-foreground',
		running: 'border border-primary/30 bg-primary/10 text-primary',
		success: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
		failed: 'border border-destructive/30 bg-destructive/10 text-destructive'
	};


	const formatRelativeTime = (iso?: string) => {
		if (!iso) return '—';
		const diffMs = Date.now() - new Date(iso).getTime();
		const minutes = Math.round(diffMs / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.round(hours / 24);
		return `${days}d ago`;
	};

	const formatDuration = (start?: string, end?: string) => {
		if (!start || !end) return '—';
		const diffMs = new Date(end).getTime() - new Date(start).getTime();
		const minutes = Math.max(1, Math.round(diffMs / 60000));
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const remainder = minutes % 60;
		return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
	};

	let { data } = $props<{ data: PageData }>();
	let historyTasks = $state<TaskWithLinks[]>([]);
	let totalTasks = $state(0);
	let isLoading = $state(false);
	let expandedTasks = $state<Record<string, boolean>>({});
	const isConnected = $derived(Boolean(data?.session));

	let activeStatus = $state<'all' | 'queued' | 'running' | 'success' | 'failed'>('all');
	let selectedAgent = $state('all');
	let selectedRepo = $state('all');
	let selectedBranch = $state<string | null>(null);
	let selectedIssue = $state<string | null>(null);
	let selectedDate = $state('any');
	let dateFrom = $state('');
	let dateTo = $state('');
	let searchInput = $state('');
	let searchQuery = $state('');
	let isSearchFocused = $state(false);

	let limit = $state(20);
	let offset = $state(0);

	const loadHistory = async () => {
		isLoading = true;
		try {
			const params = new URLSearchParams();
			if (activeStatus !== 'all') params.set('status', activeStatus);
			if (selectedAgent !== 'all') params.set('agent', selectedAgent);
			if (selectedRepo && selectedRepo !== 'all') params.set('repo', selectedRepo);
			if (selectedBranch) params.set('branch', selectedBranch);
			if (selectedIssue) {
				const issueNum = parseInt(selectedIssue.replace('#', ''));
				if (!isNaN(issueNum)) params.set('issueNumber', issueNum.toString());
			}
			if (searchQuery) params.set('search', searchQuery);
			if (dateFrom) params.set('from', dateFrom);
			if (dateTo) params.set('to', dateTo);
			params.set('limit', limit.toString());
			params.set('offset', offset.toString());

			const response = await fetch(`/api/tasks/history?${params.toString()}`);
			if (!response.ok) return;

			if (typeof window !== 'undefined') {
				const url = new URL(window.location.href);
				url.search = params.toString();
				window.history.replaceState({}, '', url.toString());
			}
			const data = (await response.json()) as {
				tasks: Task[];
				total: number;
				limit: number;
				offset: number;
			};

			historyTasks = data.tasks;
			totalTasks = data.total;
		} catch {
			// ignore
		} finally {
			isLoading = false;
		}
	};

	const resetFilters = () => {
		activeStatus = 'all';
		selectedAgent = 'all';
		selectedRepo = 'all';
		selectedBranch = null;
		selectedIssue = null;
		selectedDate = 'any';
		dateFrom = '';
		dateTo = '';
		searchInput = '';
		searchQuery = '';
		offset = 0;
		limit = 20;
	};

	const toggleExpanded = (id: string) => {
		expandedTasks = { ...expandedTasks, [id]: !expandedTasks[id] };
	};

	const handleSearchChange = (value: string) => {
		searchInput = value;
	};

	const applySmartSearch = (value: string) => {
		searchQuery = value;
		offset = 0;
	};

	const handleRowKey = (event: KeyboardEvent, id: string) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleExpanded(id);
		}
	};

	const handleViewClick = (event: MouseEvent, id: string) => {
		event.stopPropagation();
		toggleExpanded(id);
	};

	const handleLoadMore = () => {
		limit += 20;
	};

	const handleExport = () => {
		if (typeof window === 'undefined') return;
		const headers = [
			'ID',
			'Title',
			'Repository',
			'Agent',
			'Status',
			'Issue',
			'PR',
			'Duration',
			'Completed'
		];
		const rows = historyTasks.map((task) => [
			task.id,
			task.issueTitle,
			`${task.repoOwner}/${task.repoName}`,
			task.agent,
			task.status,
			task.issueNumber,
			task.prNumber ?? '',
			formatDuration(task.startedAt, task.completedAt),
			task.completedAt ?? ''
		]);

		const csv = [headers, ...rows]
			.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
			.join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'task-history.csv';
		link.click();
		URL.revokeObjectURL(url);
	};

	$effect(() => {
		const timeout = setTimeout(() => {
			applySmartSearch(searchInput.trim());
		}, 300);
		return () => clearTimeout(timeout);
	});

	const formatDate = (date: Date) => date.toISOString().slice(0, 10);

	const applyDatePreset = (preset: string) => {
		if (preset === 'any') {
			dateFrom = '';
			dateTo = '';
			return;
		}
		if (preset === 'custom') {
			return;
		}
		const today = new Date();
		const start = new Date();
		if (preset === 'today') {
			dateFrom = formatDate(today);
			dateTo = formatDate(today);
			return;
		}
		if (preset === 'last 7d') {
			start.setDate(today.getDate() - 7);
		}
		if (preset === 'last 30d') {
			start.setDate(today.getDate() - 30);
		}
		dateFrom = formatDate(start);
		dateTo = formatDate(today);
	};

	$effect(() => {
		applyDatePreset(selectedDate);
	});

	$effect(() => {
		loadHistory();
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		if (params.get('status')) {
			const status = params.get('status');
			if (status === 'success' || status === 'failed') {
				activeStatus = status;
			}
		}
		if (params.get('agent')) {
			selectedAgent = params.get('agent') ?? 'all';
		}
		if (params.get('repo')) {
			selectedRepo = params.get('repo') ?? 'all';
		}
		if (params.get('branch')) {
			selectedBranch = params.get('branch');
		}
		if (params.get('issueNumber')) {
			const issueNum = params.get('issueNumber');
			if (issueNum) selectedIssue = `#${issueNum}`;
		}
		if (params.get('from') || params.get('to')) {
			dateFrom = params.get('from') ?? '';
			dateTo = params.get('to') ?? '';
			selectedDate = 'custom';
		}
	});

	const statusCounts = $derived(
		historyTasks.reduce<Record<string, number>>((acc, task) => {
			acc[task.status] = (acc[task.status] ?? 0) + 1;
			return acc;
		}, {})
	);

	const statCards: Array<{ label: string; value: string; icon: typeof CheckCircle; tone: string }> = $derived(
		(() => {
			const total = totalTasks || historyTasks.length;
			const success = statusCounts.success ?? 0;
			const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
			const durations = historyTasks
				.map((task) => {
					if (!task.startedAt || !task.completedAt) return 0;
					return new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
				})
				.filter((value) => value > 0);
			const averageDuration =
				durations.length > 0
					? Math.round(durations.reduce((acc, value) => acc + value, 0) / durations.length / 60000)
					: 0;
			const prs = historyTasks.filter((task) => task.prNumber).length;

			return [
				{
					label: 'Completed',
					value: total.toString(),
					icon: CheckCircle,
					tone: 'text-emerald-600 bg-emerald-500/10'
				},
				{
					label: 'Success Rate',
					value: `${successRate}%`,
					icon: Percent,
					tone: 'text-primary bg-primary/10'
				},
				{
					label: 'Avg Time',
					value: averageDuration ? `${averageDuration}m` : '—',
					icon: Clock,
					tone: 'text-amber-600 bg-amber-500/10'
				},
				{
					label: 'PRs Created',
					value: prs.toString(),
					icon: GitPullRequest,
					tone: 'text-foreground/80 bg-muted/60'
				}
			];
		})()
	);

	const availableAgents: string[] = $derived([
		'all',
		...Array.from(new Set(historyTasks.map((task) => task.agent)))
	]);

	const availableRepos: string[] = $derived([
		'all',
		...Array.from(new Set(historyTasks.map((task) => `${task.repoOwner}/${task.repoName}`)))
	]);

	const availableBranches: string[] = $derived(
		Array.from(new Set(historyTasks.map((task) => task.branch).filter(Boolean) as string[]))
	);

	const availableIssues: string[] = $derived(
		Array.from(new Set(historyTasks.map((task) => `#${task.issueNumber}`)))
	);
	const repoOptions = $derived(availableRepos.filter((r) => r !== 'all'));
	const issueOptions = $derived(availableIssues);

	const statusLabel = $derived(activeStatus === 'all' ? 'Status' : activeStatus);
	const agentLabel = $derived(selectedAgent === 'all' ? 'Agent' : selectedAgent);
	const dateLabel = $derived(selectedDate === 'any' ? 'Date' : selectedDate === 'custom' ? 'Custom' : selectedDate);
	const repoLabel = $derived(selectedRepo === 'all' ? 'Repository' : selectedRepo ?? 'Repository');
	const branchLabel = $derived(selectedBranch ?? 'Branch');
	const issueLabel = $derived(selectedIssue ?? 'Issue');
	const statusIcon = $derived(
		activeStatus === 'failed'
			? WarningCircle
			: activeStatus === 'running'
				? Robot
				: activeStatus === 'queued'
					? Clock
					: CheckCircle
	);
	const filtersVisible = $derived(true);

	const filterTone = 'text-primary';

	const statusOptions = ['all', 'queued', 'running', 'success', 'failed'];

	const getStatusTone = (value: string) => {
		if (value === 'success') return 'text-emerald-600';
		if (value === 'failed') return 'text-destructive';
		if (value === 'running') return 'text-primary';
		if (value === 'queued') return 'text-muted-foreground';
		return 'text-muted-foreground';
	};

	const getAgentTone = (value: string) => {
		if (value === 'all') return 'text-muted-foreground';
		return 'text-primary';
	};

	const showingCount = $derived(historyTasks.length);
	const hasMore = $derived(showingCount < totalTasks);
</script>

<div class="space-y-8">
	{#if !isConnected}
		<div class="rounded-2xl border border-border/60 bg-card/70 p-10 text-center">
			<p class="text-sm font-semibold text-foreground">Connect GitHub to view history</p>
			<p class="mt-2 text-xs text-muted-foreground">
				Authorize Porter to record your completed tasks and PRs.
			</p>
			<div class="mt-4 flex justify-center">
				<Button size="lg" href="/api/auth/github">Connect GitHub</Button>
			</div>
		</div>
	{:else}
		<section class="flex flex-col items-center justify-center gap-2">
			<div class="flex w-full max-w-4xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-4 py-2 shadow-[0_10px_30px_-24px_rgba(15,15,15,0.5)] transition focus-within:border-border/90 focus-within:bg-card">
				<span class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
					Search
				</span>
				<MagnifyingGlass size={16} weight="bold" class="text-muted-foreground" />
				<div class="relative flex-1">
					<Input
						value={searchInput}
						class="h-10 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
						oninput={(event) => handleSearchChange((event.currentTarget as HTMLInputElement).value)}
						onfocus={() => (isSearchFocused = true)}
						onblur={() => (isSearchFocused = false)}
					/>
				</div>
				<Button variant="ghost" size="sm" onclick={resetFilters}>
					<X size={14} weight="bold" />
					Clear
				</Button>
			</div>
			{#if filtersVisible}
				<div class="flex w-full max-w-4xl flex-wrap items-center justify-center gap-2">
					<GitFilterButton
						icon={statusIcon}
						label="Status"
						options={statusOptions}
						bind:selected={activeStatus}
						displayValue={statusLabel}
						toneClass={filterTone}
						itemIconType="dot"
						getItemTone={getStatusTone}
					/>
					<GitFilterButton
						icon={Robot}
						label="Agent"
						options={availableAgents}
						bind:selected={selectedAgent}
						displayValue={agentLabel}
						toneClass={filterTone}
						itemIconType="image"
						getItemIcon={(value) => (value === 'all' ? null : getAgentIcon(value))}
						getItemTone={getAgentTone}
					/>
					<DateFilterButton
						label="Date"
						bind:selectedPreset={selectedDate}
						bind:dateFrom={dateFrom}
						bind:dateTo={dateTo}
						displayValue={dateLabel}
						toneClass={filterTone}
						onPresetSelect={applyDatePreset}
					/>
					<div class="h-4 w-px bg-border/80"></div>
					<GitFilterButton
						icon={GitCommit}
						label="Repository"
						options={repoOptions}
						bind:selected={selectedRepo}
						displayValue={repoLabel}
						toneClass={filterTone}
						onSelect={(value) => {
							if (!value) selectedRepo = 'all';
						}}
					/>
					<GitFilterButton
						icon={GitBranch}
						label="Branch"
						options={availableBranches}
						bind:selected={selectedBranch}
						displayValue={branchLabel}
						toneClass={filterTone}
					/>
					<GitFilterButton
						icon={GitCommit}
						label="Issue"
						options={issueOptions}
						bind:selected={selectedIssue}
						displayValue={issueLabel}
						toneClass={filterTone}
					/>
				</div>
			{/if}
		</section>

	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		{#each statCards as stat}
			<Card.Root class="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-[0_12px_30px_-28px_rgba(15,15,15,0.5)] transition hover:border-border/90">
				<Card.Content class="flex items-center justify-between gap-4 px-4 py-3">
					<div class="space-y-1">
						<div class="text-xl font-semibold text-foreground">{stat.value}</div>
						<div class="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
							{stat.label}
						</div>
					</div>
					<div
						class={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-border/40 ${stat.tone}`}
					>
						<svelte:component this={stat.icon} size={18} weight="bold" />
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</section>

	<section class="space-y-6">
		<section class="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-lg backdrop-blur">
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
					History Table
				</p>
				<Button variant="secondary" size="icon" type="button" onclick={handleExport}>
					<DownloadSimple size={16} weight="bold" />
					<span class="sr-only">Download CSV</span>
				</Button>
			</div>
			<div class="mt-3 grid grid-cols-[120px_2fr_1fr_1fr_1fr_auto] items-center gap-4 rounded-xl bg-muted/40 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
				<span>Status</span>
				<span>Task</span>
				<span>Repository</span>
				<span>Agent</span>
				<span>Completed</span>
				<span class="text-right">Actions</span>
			</div>

			{#if isLoading}
				<div class="mt-4 space-y-3">
					{#each Array(4) as _}
						<Card.Root class="border border-border/60 bg-background/80 animate-pulse">
							<Card.Content class="grid min-h-[72px] grid-cols-[120px_2fr_1fr_1fr_1fr_auto] items-center gap-4 py-3">
								<div class="h-6 w-16 rounded bg-muted"></div>
								<div class="space-y-2">
									<div class="h-4 w-2/3 rounded bg-muted"></div>
									<div class="h-3 w-1/2 rounded bg-muted"></div>
								</div>
								<div class="h-4 w-20 rounded bg-muted"></div>
								<div class="h-6 w-24 rounded bg-muted"></div>
								<div class="h-4 w-16 rounded bg-muted"></div>
								<div class="h-8 w-16 rounded bg-muted"></div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{:else if historyTasks.length === 0}
				<div class="flex flex-col items-center gap-2 py-12 text-center">
					<p class="text-sm font-medium">No completed tasks found</p>
					<p class="text-xs text-muted-foreground">Try adjusting your filters to widen the results.</p>
					<Button variant="secondary" size="sm" onclick={resetFilters}>Clear filters</Button>
				</div>
			{:else}
				<div class="mt-4 space-y-3">
					{#each historyTasks as task}
						<Card.Root
							class="border border-border/60 bg-background/80 transition hover:border-border/80 hover:bg-background/95"
							role="button"
							tabindex={0}
							onclick={() => toggleExpanded(task.id)}
							onkeydown={(event: KeyboardEvent) => handleRowKey(event, task.id)}
						>
							<Card.Content class="grid min-h-[72px] grid-cols-[120px_2fr_1fr_1fr_1fr_auto] items-center gap-4 px-2 py-3">
								<Badge class={`text-[0.6rem] font-semibold uppercase tracking-[0.2em] ${statusStyles[task.status]}`}>
									{task.status === 'success'
										? 'DONE'
										: task.status === 'failed'
											? 'FAIL'
											: task.status === 'running'
												? 'RUN'
												: 'QUE'}
								</Badge>
								<div>
									<div class="font-medium text-foreground">{task.issueTitle}</div>
									<div class="text-xs text-muted-foreground">
										Issue #{task.issueNumber}
										{task.prNumber ? ` · PR #${task.prNumber}` : ''}
									</div>
								</div>
								<div class="text-xs text-muted-foreground font-mono">
									{task.repoOwner}/{task.repoName}
								</div>
								<Badge variant="outline" class="text-xs capitalize font-mono gap-2">
									<img class="h-3.5 w-3.5" src={getAgentIcon(task.agent)} alt={task.agent} />
									{task.agent}
								</Badge>
								<span class="text-xs text-muted-foreground font-mono">
									{formatRelativeTime(task.completedAt)}
								</span>
								<div class="flex items-center justify-end gap-2">
									<Button variant="ghost" size="sm" onclick={(event) => handleViewClick(event, task.id)}>
										View
									</Button>
									{#if expandedTasks[task.id]}
										<CaretUp size={16} weight="bold" class="text-muted-foreground" />
									{:else}
										<CaretDown size={16} weight="bold" class="text-muted-foreground" />
									{/if}
								</div>
							</Card.Content>
						</Card.Root>

						{#if expandedTasks[task.id]}
							<Card.Root class="border border-border/60 bg-background/70">
								<Card.Content class="space-y-4 p-4">
									<div class="grid gap-4 md:grid-cols-4">
										<div>
											<p class="text-xs uppercase text-muted-foreground">Issue</p>
											<p class="text-sm font-medium">#{task.issueNumber}</p>
										</div>
										<div>
											<p class="text-xs uppercase text-muted-foreground">Repository</p>
											<p class="text-sm font-medium">{task.repoOwner}/{task.repoName}</p>
										</div>
										<div>
											<p class="text-xs uppercase text-muted-foreground">Duration</p>
											<p class="text-sm font-medium">
												{formatDuration(task.startedAt, task.completedAt)}
											</p>
										</div>
										<div>
											<p class="text-xs uppercase text-muted-foreground">Completed</p>
											<p class="text-sm font-medium">{formatRelativeTime(task.completedAt)}</p>
										</div>
									</div>

									{#if task.errorMessage}
										<div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
											{task.errorMessage}
										</div>
									{/if}

									<Card.Root>
										<Card.Header class="pb-2">
											<Card.Title class="text-sm">Task Logs</Card.Title>
										</Card.Header>
										<Card.Content class="space-y-2 text-xs">
											{#if task.logs.length === 0}
												<div class="text-muted-foreground">No logs recorded.</div>
											{:else}
												{#each task.logs as log}
													<div class="grid grid-cols-[70px_80px_1fr] items-center gap-3 text-muted-foreground font-mono">
														<span>{log.time}</span>
														<span class="font-semibold uppercase text-foreground">{log.level}</span>
														<span>{log.message}</span>
													</div>
												{/each}
											{/if}
										</Card.Content>
									</Card.Root>

									<div class="flex flex-wrap gap-2">
										<Button variant="secondary" size="sm">
											<ArrowCounterClockwise size={14} weight="bold" />
											Retry
										</Button>
										<Button
											variant="secondary"
											size="sm"
											href={task.issueUrl}
											target="_blank"
											rel="noopener noreferrer"
											disabled={!task.issueUrl}
										>
											<ArrowUpRight size={14} weight="bold" />
											View Issue
										</Button>
										<Button
											variant="secondary"
											size="sm"
											href={task.prUrl}
											target="_blank"
											rel="noopener noreferrer"
											disabled={!task.prUrl}
										>
											<ArrowUpRight size={14} weight="bold" />
											View PR
										</Button>
									</div>
								</Card.Content>
							</Card.Root>
						{/if}
					{/each}
				</div>
			{/if}
		</section>

		{#if !isLoading && hasMore}
			<div class="mt-4 flex items-center justify-center">
				<Button variant="secondary" size="sm" onclick={handleLoadMore}>Load more</Button>
			</div>
		{/if}
	</section>
	{/if}
</div>
