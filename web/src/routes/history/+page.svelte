<script lang="ts">
	import {
		ArrowCounterClockwise,
		ArrowUpRight,
		CaretDown,
		CaretUp,
		CheckCircle,
		Clock,
		DownloadSimple,
		GitPullRequest,
		MagnifyingGlass,
		Percent,
		X
	} from 'phosphor-svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { Task } from '$lib/server/types';

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

	let historyTasks = $state<Task[]>([]);
	let totalTasks = $state(0);
	let isLoading = $state(false);
	let expandedTasks = $state<Record<string, boolean>>({});

	let activeStatus = $state<'all' | 'success' | 'failed'>('all');
	let selectedAgent = $state('all');
	let selectedRepo = $state('all');
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
			if (selectedRepo !== 'all') params.set('repo', selectedRepo);
			if (searchQuery) params.set('search', searchQuery);
			if (dateFrom) params.set('from', dateFrom);
			if (dateTo) params.set('to', dateTo);
			params.set('limit', limit.toString());
			params.set('offset', offset.toString());

			const response = await fetch(`/api/tasks/history?${params.toString()}`);
			if (!response.ok) return;
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

	const baseSuggestions = [
		'status:failed',
		'status:success',
		'agent:claude',
		'repo:porter/app',
		'date:2026-01-21..2026-01-22'
	];

	const handleSuggestionClick = (suggestion: string) => {
		const trimmed = searchInput.trim();
		const nextValue = trimmed ? `${trimmed} ${suggestion}` : suggestion;
		searchInput = nextValue;
		applySmartSearch(nextValue);
		isSearchFocused = true;
	};

	const getSuggestionTone = (suggestion: string) => {
		if (suggestion.startsWith('status:failed')) {
			return 'border-destructive/30 bg-destructive/10 text-destructive';
		}
		if (suggestion.startsWith('status:success')) {
			return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
		}
		if (suggestion.startsWith('agent:')) {
			return 'border-sky-500/30 bg-sky-500/10 text-sky-600';
		}
		if (suggestion.startsWith('repo:')) {
			return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
		}
		if (suggestion.startsWith('date:')) {
			return 'border-slate-500/30 bg-slate-500/10 text-slate-600';
		}
		return 'border-border/60 bg-muted/40 text-muted-foreground';
	};

	const getSearchSuggestions = () => {
		const trimmed = searchInput.trim();
		const tokens = trimmed ? trimmed.split(/\s+/) : [];
		const lastToken = tokens[tokens.length - 1] ?? '';
		if (!lastToken || !lastToken.includes(':')) {
			return baseSuggestions;
		}
		if (lastToken.startsWith('status:')) {
			return ['status:success', 'status:failed', 'status:all'];
		}
		if (lastToken.startsWith('agent:')) {
			return availableAgents.filter((agent) => agent !== 'all').map((agent) => `agent:${agent}`);
		}
		if (lastToken.startsWith('repo:')) {
			return availableRepos.filter((repo) => repo !== 'all').map((repo) => `repo:${repo}`);
		}
		if (lastToken.startsWith('date:')) {
			return ['date:YYYY-MM-DD..YYYY-MM-DD'];
		}
		return baseSuggestions;
	};

	const parseSearchQuery = (value: string) => {
		const parsed = {
			status: 'all',
			agent: 'all',
			repo: 'all',
			dateFrom: '',
			dateTo: '',
			freeText: ''
		};
		if (!value.trim()) return parsed;
		const terms: string[] = [];
		for (const token of value.split(/\s+/)) {
			const [rawKey, ...rawValueParts] = token.split(':');
			if (rawValueParts.length === 0) {
				terms.push(token);
				continue;
			}
			const key = rawKey.toLowerCase();
			const rawValue = rawValueParts.join(':');
			const rawValueLower = rawValue.toLowerCase();
			if (key === 'status') {
				if (['all', 'success', 'failed'].includes(rawValueLower)) {
					parsed.status = rawValueLower;
					continue;
				}
			}
			if (key === 'agent') {
				parsed.agent = rawValue;
				continue;
			}
			if (key === 'repo') {
				parsed.repo = rawValue;
				continue;
			}
			if (key === 'date') {
				const [from, to] = rawValue.split('..');
				parsed.dateFrom = from ?? '';
				parsed.dateTo = to ?? '';
				continue;
			}
			terms.push(token);
		}
		parsed.freeText = terms.join(' ');
		return parsed;
	};

	const applySmartSearch = (value: string) => {
		const parsed = parseSearchQuery(value);
		activeStatus = parsed.status as 'all' | 'success' | 'failed';
		selectedAgent = parsed.agent;
		selectedRepo = parsed.repo;
		dateFrom = parsed.dateFrom;
		dateTo = parsed.dateTo;
		searchQuery = parsed.freeText;
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

	$effect(() => {
		loadHistory();
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

	const showingCount = $derived(historyTasks.length);
	const hasMore = $derived(showingCount < totalTasks);
</script>

<div class="space-y-8">
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
			<Button variant="ghost" size="sm" disabled={!searchInput} onclick={resetFilters}>
				<X size={14} weight="bold" />
				Clear
			</Button>
		</div>
		{#if isSearchFocused}
			<div class="flex w-full max-w-4xl flex-wrap items-center justify-center gap-2">
				{#each getSearchSuggestions() as suggestion}
					<button
						class={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] transition hover:border-border/80 hover:bg-muted/60 ${getSuggestionTone(suggestion)}`}
						on:mousedown|preventDefault={() => handleSuggestionClick(suggestion)}
					>
						{suggestion}
					</button>
				{/each}
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
							{task.status === 'success' ? 'DONE' : 'FAIL'}
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
						<Button variant="secondary" size="sm" disabled={!task.prNumber}>
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

	{#if !isLoading && hasMore}
		<div class="mt-4 flex items-center justify-center">
			<Button variant="secondary" size="sm" onclick={handleLoadMore}>Load more</Button>
		</div>
	{/if}
</section>
	</section>
</div>
