<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { AgentConfig } from '$lib/types/agent';

	type AgentDisplay = AgentConfig & {
		readyState?: 'ready' | 'missing_credentials' | 'disabled';
		displayName?: string;
		provider?: string;
		requiredKeys?: string[];
	};

	let {
		agents = $bindable([] as AgentDisplay[]),
		onrefresh,
		onsave,
		onopencredentials,
		framed = true,
		mode = 'full'
	}: {
		agents?: AgentDisplay[];
		onrefresh?: () => void;
		onsave?: (config: AgentDisplay[]) => void;
		onopencredentials?: () => void;
		framed?: boolean;
		mode?: 'full' | 'quick';
	} = $props();

	const agentDomains: Record<string, string> = {
		opencode: 'opencode.ai',
		'claude-code': 'claude.ai',
		amp: 'ampcode.com'
	};

	const getAgentIcon = (name: string, domain?: string) => {
		const iconDomain = agentDomains[name] ?? domain;
		return iconDomain ? `https://www.google.com/s2/favicons?domain=${iconDomain}&sz=64` : '';
	};

	const isReady = (agent: AgentDisplay) => agent.readyState === 'ready';
	const needsCredentials = (agent: AgentDisplay) => agent.readyState === 'missing_credentials';
	const getAgentLabel = (agent: AgentDisplay) => agent.displayName ?? agent.name;
	const getProviderLabel = (agent: AgentDisplay) => agent.provider ?? 'Provider';

	const toggleAgent = (name: string) => {
		agents = agents.map((agent) =>
			agent.name === name ? { ...agent, enabled: !agent.enabled } : agent
		);
	};

	const updatePrompt = (name: string, customPrompt: string) => {
		agents = agents.map((agent) => (agent.name === name ? { ...agent, customPrompt } : agent));
	};

	const autoResizeTextarea = (event: Event) => {
		const target = event.target as HTMLTextAreaElement;
		target.style.height = 'auto';
		const lineHeight = 20;
		const maxHeight = lineHeight * 6 + 16;
		target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
		target.style.overflowY = target.scrollHeight > maxHeight ? 'auto' : 'hidden';
	};

	const handleOpenCredentials = async () => {
		if (onopencredentials) {
			onopencredentials();
			return;
		}
		await goto('/settings#credentials');
	};

	const handleSave = () => onsave?.(agents);
	const handleRefresh = () => onrefresh?.();
</script>

{#if framed}
	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex items-center justify-between">
				<Card.Title class="text-sm">Agent Configuration</Card.Title>
				<Button variant="secondary" size="sm" type="button" onclick={handleRefresh}>Refresh</Button>
			</div>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#if agents.length === 0}
				<div class="rounded-lg border border-dashed border-border p-8 text-center">
					<p class="text-sm text-muted-foreground">No agents detected</p>
					<Button variant="outline" size="sm" class="mt-3" onclick={handleRefresh}>Scan for Agents</Button>
				</div>
			{:else}
				<div class="space-y-3">
					{#each agents as agent}
						<div class="rounded-xl border border-border/60 bg-background/70 p-3">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="flex min-w-0 items-center gap-3">
									{#if agent.domain || agent.name}
										<img class="h-8 w-8 rounded-lg border border-border/60" src={getAgentIcon(agent.name, agent.domain)} alt={getAgentLabel(agent)} />
									{/if}
									<div class="min-w-0">
										<div class="flex items-center gap-2">
											<h4 class="truncate text-sm font-semibold capitalize">{getAgentLabel(agent)}</h4>
											<Badge variant="outline" class={isReady(agent) ? 'text-emerald-600 bg-emerald-500/15' : 'text-muted-foreground bg-muted'}>
												{needsCredentials(agent) ? 'Missing keys' : agent.status}
											</Badge>
										</div>
										<p class="text-xs text-muted-foreground">{getProviderLabel(agent)} provider</p>
										{#if needsCredentials(agent)}
											<p class="mt-1 text-xs text-amber-600">
												⚠ Missing {getProviderLabel(agent)} key ·
												<button type="button" class="font-semibold hover:underline" onclick={handleOpenCredentials}>Settings →</button>
											</p>
										{/if}
									</div>
								</div>
								<Button variant={agent.enabled ? 'secondary' : 'default'} size="sm" type="button" onclick={() => toggleAgent(agent.name)}>
									{agent.enabled ? 'Disable' : 'Enable'}
								</Button>
							</div>
							<div class="mt-3 space-y-1.5">
									<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Prompt Guidance</p>
									<textarea
										value={agent.customPrompt ?? ''}
										placeholder="Add default instructions..."
										rows="2"
										class="min-h-[56px] w-full resize-none rounded-lg border border-border/70 bg-background px-3 py-2 text-sm shadow-[0_1px_2px_rgba(20,19,18,0.06)] focus:outline-none focus:ring-2 focus:ring-ring/40"
										onfocus={autoResizeTextarea}
										oninput={(event) => {
											autoResizeTextarea(event);
											updatePrompt(agent.name, (event.target as HTMLTextAreaElement).value);
										}}
										disabled={!agent.enabled}
									></textarea>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
		<Card.Footer class="justify-end">
			<Button type="button" onclick={handleSave}>Save Changes</Button>
		</Card.Footer>
	</Card.Root>
{:else}
<div class={mode === 'quick' ? 'space-y-2.5' : 'space-y-3'}>
		{#if agents.length === 0}
			<div class="rounded-xl border border-dashed border-border/60 bg-card/50 p-8 text-center">
				<p class="text-sm text-muted-foreground">No agents detected</p>
				<Button variant="outline" size="sm" class="mt-3" onclick={handleRefresh}>Scan for Agents</Button>
			</div>
		{:else}
			{#each agents as agent}
				<div class="rounded-xl border border-border/60 bg-card/70 p-3">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							{#if agent.domain || agent.name}
								<img class="h-8 w-8 rounded-lg border border-border/60 bg-background/80" src={getAgentIcon(agent.name, agent.domain)} alt={getAgentLabel(agent)} />
							{/if}
							<div class="min-w-0">
								<p class="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Agent</p>
								<div class="flex items-center gap-2">
									<h4 class="truncate text-sm font-semibold capitalize text-foreground">{getAgentLabel(agent)}</h4>
									<Badge variant="outline" class={isReady(agent) ? 'text-emerald-600 bg-emerald-500/15' : 'text-muted-foreground bg-muted'}>
										{needsCredentials(agent) ? 'Missing keys' : agent.status}
									</Badge>
								</div>
								<p class="text-xs text-muted-foreground">{getProviderLabel(agent)} provider</p>
								{#if needsCredentials(agent)}
									<p class="mt-1 text-xs text-amber-600">
										⚠ Missing {getProviderLabel(agent)} key ·
										<button type="button" class="font-semibold hover:underline" onclick={handleOpenCredentials}>Settings →</button>
									</p>
								{/if}
							</div>
						</div>
						<Button variant={agent.enabled ? 'secondary' : 'default'} size="sm" type="button" onclick={() => toggleAgent(agent.name)}>
							{agent.enabled ? 'Disable' : 'Enable'}
						</Button>
					</div>

					<div class="mt-3 space-y-1.5">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Prompt Guidance</p>
							<textarea
								value={agent.customPrompt ?? ''}
								placeholder="Add default instructions..."
								rows="2"
								class="min-h-[56px] w-full resize-none rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-[0_1px_2px_rgba(20,19,18,0.06)] focus:outline-none focus:ring-2 focus:ring-ring/40"
								onfocus={autoResizeTextarea}
								oninput={(event) => {
									autoResizeTextarea(event);
									updatePrompt(agent.name, (event.target as HTMLTextAreaElement).value);
								}}
								disabled={!agent.enabled}
							></textarea>
					</div>
				</div>
			{/each}
		{/if}
	</div>
{/if}
