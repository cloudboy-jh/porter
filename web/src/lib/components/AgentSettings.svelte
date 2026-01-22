<!--
	AgentSettings - Agent Configuration Form Component
	
	This is a reusable form component for managing agent configuration.
	It displays agent status, enable/disable toggles, and cloud defaults.
	
	Used in:
	- AgentSettingsModal (Dashboard "Agents" button)
	- /settings page (full settings page)
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import type { AgentConfig } from '$lib/types/agent';
	import { Clock, Target, TrendUp } from 'phosphor-svelte';

	let {
		agents = $bindable([] as AgentConfig[]),
		onrefresh,
		onsave,
		framed = true
	}: {
		agents?: AgentConfig[];
		onrefresh?: () => void;
		onsave?: (config: AgentConfig[]) => void;
		framed?: boolean;
	} = $props();

	const getAgentIcon = (domain?: string) =>
		domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

	const toggleAgent = (name: string) => {
		agents = agents.map((agent) =>
			agent.name === name ? { ...agent, enabled: !agent.enabled } : agent
		);
	};

	const updatePriority = (name: string, priority: AgentConfig['priority']) => {
		agents = agents.map((agent) => (agent.name === name ? { ...agent, priority } : agent));
	};

	const updatePrompt = (name: string, customPrompt: string) => {
		agents = agents.map((agent) => (agent.name === name ? { ...agent, customPrompt } : agent));
	};

	let expandedPrompts = $state<Record<string, boolean>>({});

	const isPromptExpanded = (name: string) => expandedPrompts[name] ?? false;

	const togglePrompt = (name: string) => {
		expandedPrompts = { ...expandedPrompts, [name]: !isPromptExpanded(name) };
	};

	const handleSave = () => {
		onsave?.(agents);
	};

	const handleRefresh = () => {
		onrefresh?.();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'idle':
				return 'text-emerald-600 bg-emerald-500/15';
			case 'active':
				return 'text-amber-600 bg-amber-500/15';
			case 'error':
				return 'text-destructive bg-destructive/15';
			case 'disabled':
				return 'text-muted-foreground bg-muted';
			default:
				return 'text-muted-foreground bg-muted';
		}
	};

	const contentClass = framed ? 'space-y-3' : 'space-y-4';
</script>

{#if framed}
	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="text-sm">Agent Configuration</Card.Title>
				</div>
				<Button variant="secondary" size="sm" type="button" onclick={handleRefresh}>
					Refresh
				</Button>
			</div>
		</Card.Header>
		<Card.Content class={contentClass}>
			{#if agents.length === 0}
				<div class="rounded-lg border border-dashed border-border p-8 text-center">
					<p class="text-sm text-muted-foreground">No agents detected</p>
					<Button variant="outline" size="sm" class="mt-3" onclick={handleRefresh}>
						Scan for Agents
					</Button>
				</div>
			{:else}
				<div class={contentClass}>
					{#each agents as agent}
						<div class="rounded-lg border border-border/60 bg-background/70 p-4">
							<div class="flex flex-wrap items-center justify-between gap-4">
								<div class="flex items-center gap-3">
									{#if agent.domain}
										<img
											class="h-10 w-10 rounded-lg border border-border"
											src={getAgentIcon(agent.domain)}
											alt={agent.name}
										/>
									{/if}
									<div>
										<div class="flex items-center gap-2">
											<h4 class="font-medium capitalize">{agent.name}</h4>
											<Badge variant="outline" class={getStatusColor(agent.status)}>
												{agent.status}
											</Badge>
										</div>
										{#if agent.version}
											<p class="mt-0.5 text-xs text-muted-foreground">Version {agent.version}</p>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-2">
									<Button
										variant={agent.enabled ? 'secondary' : 'default'}
										size="sm"
										type="button"
										onclick={() => toggleAgent(agent.name)}
									>
										{agent.enabled ? 'Disable' : 'Enable'}
									</Button>
								</div>
							</div>

							{#if agent.enabled && (agent.taskCount || agent.successRate || agent.lastUsed)}
								<Separator class="my-3" />
								<div class="grid grid-cols-3 gap-4 text-sm">
									{#if agent.taskCount !== undefined}
										<div class="flex items-center gap-2">
										<Target size={14} weight="bold" class="text-muted-foreground" />
											<div>
												<p class="text-xs text-muted-foreground">Tasks</p>
												<p class="font-medium font-mono">{agent.taskCount}</p>
											</div>
										</div>
									{/if}
									{#if agent.successRate !== undefined}
										<div class="flex items-center gap-2">
											<TrendingUp size={14} class="text-emerald-600" />
											<div>
												<p class="text-xs text-muted-foreground">Success</p>
												<p class="font-medium font-mono text-emerald-600">
													{agent.successRate}%
												</p>
											</div>
										</div>
									{/if}
									{#if agent.lastUsed}
										<div class="flex items-center gap-2">
										<Clock size={14} weight="bold" class="text-muted-foreground" />
											<div>
												<p class="text-xs text-muted-foreground">Last Used</p>
												<p class="font-medium">{agent.lastUsed}</p>
											</div>
										</div>
									{/if}
								</div>
							{/if}

							<Separator class="my-3" />
							<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
								<div class="space-y-2">
									<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Default Priority
									</p>
									<RadioGroup.Root
										value={agent.priority}
										onValueChange={(value) =>
											updatePriority(agent.name, value as AgentConfig['priority'])
										}
										class="grid grid-cols-3 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
										disabled={!agent.enabled}
									>
										<label class="flex-1 cursor-pointer">
											<RadioGroup.Item value="low" class="peer sr-only" />
											<div
												class="rounded-md px-3 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-[0_1px_2px_rgba(20,19,18,0.08)]"
											>
												Low
											</div>
										</label>
										<label class="flex-1 cursor-pointer">
											<RadioGroup.Item value="normal" class="peer sr-only" />
											<div
												class="rounded-md px-3 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-[0_1px_2px_rgba(20,19,18,0.08)]"
											>
												Normal
											</div>
										</label>
										<label class="flex-1 cursor-pointer">
											<RadioGroup.Item value="high" class="peer sr-only" />
											<div
												class="rounded-md px-3 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-[0_1px_2px_rgba(20,19,18,0.08)]"
											>
												High
											</div>
										</label>
									</RadioGroup.Root>
								</div>
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
											Custom Prompt
										</p>
										<button
											type="button"
											class="text-xs font-semibold text-foreground/70 transition hover:text-foreground"
											onclick={() => togglePrompt(agent.name)}
											disabled={!agent.enabled}
										>
											{isPromptExpanded(agent.name) ? 'Collapse' : 'Expand'}
										</button>
									</div>
									{#if isPromptExpanded(agent.name)}
										<textarea
											value={agent.customPrompt ?? ''}
											placeholder="Add default instructions for this agent..."
											rows="3"
											class="w-full resize-none rounded-lg border border-border/70 bg-background px-3 py-2 text-sm shadow-[0_1px_2px_rgba(20,19,18,0.06)] focus:outline-none focus:ring-2 focus:ring-ring/40"
											oninput={(event) =>
												updatePrompt(agent.name, (event.target as HTMLTextAreaElement).value)
											}
											disabled={!agent.enabled}
										></textarea>
									{:else}
										<input
											value={agent.customPrompt ?? ''}
											placeholder="Add default instructions..."
											class="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm shadow-[0_1px_2px_rgba(20,19,18,0.06)] focus:outline-none focus:ring-2 focus:ring-ring/40"
											oninput={(event) =>
												updatePrompt(agent.name, (event.target as HTMLInputElement).value)
											}
											disabled={!agent.enabled}
										/>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
		<Card.Footer class="flex items-center justify-between">
			<Button variant="ghost" size="sm" type="button" onclick={handleRefresh}>
				Refresh
			</Button>
			<Button type="button" onclick={handleSave}>Save Changes</Button>
		</Card.Footer>
	</Card.Root>
{:else}
	<div class={contentClass}>
		{#if agents.length === 0}
			<div class="rounded-lg border border-dashed border-border p-8 text-center">
				<p class="text-sm text-muted-foreground">No agents detected</p>
				<Button variant="outline" size="sm" class="mt-3" onclick={handleRefresh}>
					Scan for Agents
				</Button>
			</div>
		{:else}
			<div class={contentClass}>
				{#each agents as agent}
					<div class="rounded-lg border border-border/60 bg-background/70 p-4">
						<div class="flex flex-wrap items-center justify-between gap-4">
							<div class="flex items-center gap-3">
								{#if agent.domain}
									<img
										class="h-10 w-10 rounded-lg border border-border"
										src={getAgentIcon(agent.domain)}
										alt={agent.name}
									/>
								{/if}
								<div>
									<div class="flex items-center gap-2">
										<h4 class="font-medium capitalize">{agent.name}</h4>
										<Badge variant="outline" class={getStatusColor(agent.status)}>
											{agent.status}
										</Badge>
									</div>
									{#if agent.version}
										<p class="mt-0.5 text-xs text-muted-foreground">Version {agent.version}</p>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Button
									variant={agent.enabled ? 'secondary' : 'default'}
									size="sm"
									type="button"
									onclick={() => toggleAgent(agent.name)}
								>
									{agent.enabled ? 'Disable' : 'Enable'}
								</Button>
							</div>
						</div>

						{#if agent.enabled && (agent.taskCount || agent.successRate || agent.lastUsed)}
							<Separator class="my-3" />
							<div class="grid grid-cols-3 gap-4 text-sm">
								{#if agent.taskCount !== undefined}
									<div class="flex items-center gap-2">
										<Target size={14} weight="bold" class="text-muted-foreground" />
										<div>
											<p class="text-xs text-muted-foreground">Tasks</p>
											<p class="font-medium font-mono">{agent.taskCount}</p>
										</div>
									</div>
								{/if}
								{#if agent.successRate !== undefined}
									<div class="flex items-center gap-2">
										<TrendUp size={14} weight="bold" class="text-emerald-600" />
										<div>
											<p class="text-xs text-muted-foreground">Success</p>
											<p class="font-medium font-mono text-emerald-600">
												{agent.successRate}%
											</p>
										</div>
									</div>
								{/if}
								{#if agent.lastUsed}
									<div class="flex items-center gap-2">
										<Clock size={14} weight="bold" class="text-muted-foreground" />
										<div>
											<p class="text-xs text-muted-foreground">Last Used</p>
											<p class="font-medium">{agent.lastUsed}</p>
										</div>
									</div>
								{/if}
							</div>
						{/if}

						<Separator class="my-3" />
						<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
							<div class="space-y-2">
								<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
									Default Priority
								</p>
								<RadioGroup.Root
									value={agent.priority}
									onValueChange={(value) =>
										updatePriority(agent.name, value as AgentConfig['priority'])
									}
									class="grid grid-cols-3 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
									disabled={!agent.enabled}
								>
									<label class="flex-1 cursor-pointer">
										<RadioGroup.Item value="low" class="peer sr-only" />
										<div
											class="rounded-md px-3 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-[0_1px_2px_rgba(20,19,18,0.08)]"
										>
											Low
										</div>
									</label>
									<label class="flex-1 cursor-pointer">
										<RadioGroup.Item value="normal" class="peer sr-only" />
										<div
											class="rounded-md px-3 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-[0_1px_2px_rgba(20,19,18,0.08)]"
										>
											Normal
										</div>
									</label>
									<label class="flex-1 cursor-pointer">
										<RadioGroup.Item value="high" class="peer sr-only" />
										<div
											class="rounded-md px-3 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-[0_1px_2px_rgba(20,19,18,0.08)]"
										>
											High
										</div>
									</label>
								</RadioGroup.Root>
							</div>
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Custom Prompt
									</p>
									<button
										type="button"
										class="text-xs font-semibold text-foreground/70 transition hover:text-foreground"
										onclick={() => togglePrompt(agent.name)}
										disabled={!agent.enabled}
									>
										{isPromptExpanded(agent.name) ? 'Collapse' : 'Expand'}
									</button>
								</div>
								{#if isPromptExpanded(agent.name)}
									<textarea
										value={agent.customPrompt ?? ''}
										placeholder="Add default instructions for this agent..."
										rows="3"
										class="w-full resize-none rounded-lg border border-border/70 bg-background px-3 py-2 text-sm shadow-[0_1px_2px_rgba(20,19,18,0.06)] focus:outline-none focus:ring-2 focus:ring-ring/40"
										oninput={(event) =>
											updatePrompt(agent.name, (event.target as HTMLTextAreaElement).value)
										}
										disabled={!agent.enabled}
									></textarea>
								{:else}
									<input
										value={agent.customPrompt ?? ''}
										placeholder="Add default instructions..."
										class="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm shadow-[0_1px_2px_rgba(20,19,18,0.06)] focus:outline-none focus:ring-2 focus:ring-ring/40"
										oninput={(event) =>
											updatePrompt(agent.name, (event.target as HTMLInputElement).value)
										}
										disabled={!agent.enabled}
									/>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
