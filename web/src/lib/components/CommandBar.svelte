<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Check, Command, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	const dispatch = createEventDispatcher<{ close: void; submit: { payload: ParsedCommand } }>();
	let { open = $bindable(false), agents = [] as string[] } = $props();

	let command = $state('');
	let parsed: ParsedCommand | null = $state(null);
	let error = $state('');

	type ParsedCommand = {
		agent: string;
		repoOwner: string;
		repoName: string;
		issueNumber: number;
		priority: string;
		prompt: string;
	};

	const reset = () => {
		command = '';
		parsed = null;
		error = '';
	};

	const parseCommand = (input: string) => {
		error = '';
		const normalized = input.trim();
		if (!normalized) {
			parsed = null;
			return;
		}
		const cleaned = normalized.startsWith('@porter')
			? normalized.replace(/^@porter\s+/i, '')
			: normalized;
		const normalizedInput = cleaned.replace(/^@porter\s+/i, '');
		const cleanedInput = normalizedInput.replace(/https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/\d+/i, (match) => match.trim());
		const coreInput = cleanedInput.trim();
		const [core, ...flags] = coreInput.split(/\s+--/);
		const tokens = core.trim().split(/\s+/);
		if (tokens.length < 2) {
			error = 'Add an agent and issue reference.';
			parsed = null;
			return;
		}
		const agent = tokens[0];
		const issueToken = tokens[1];
		const urlMatch = issueToken.match(
			/^https?:\/\/github\.com\/(?<owner>[\w.-]+)\/(?<repo>[\w.-]+)\/issues\/(?<issue>\d+)/i
		);
		const shorthandMatch = issueToken.match(/^(?<owner>[\w.-]+)\/(?<repo>[\w.-]+)#(?<issue>\d+)$/);
		const issueMatch = urlMatch ?? shorthandMatch;
		if (!issueMatch?.groups) {
			error = 'Issue format should be owner/repo#123 or a GitHub issue URL.';
			parsed = null;
			return;
		}
		const parsedFlags = flags.reduce<Record<string, string>>((acc, flag) => {
			const [key, ...rest] = flag.split(' ');
			acc[key.trim()] = rest.join(' ').replace(/^"|"$/g, '').trim();
			return acc;
		}, {});
		parsed = {
			agent,
			repoOwner: issueMatch.groups.owner,
			repoName: issueMatch.groups.repo,
			issueNumber: Number(issueMatch.groups.issue),
			priority: parsedFlags.priority || 'normal',
			prompt: parsedFlags.prompt || ''
		};
		if (agents.length && !agents.includes(agent)) {
			error = `Unknown agent "${agent}".`;
		}
	};

	const handleSubmit = () => {
		if (!parsed || error) {
			return;
		}
		dispatch('submit', { payload: parsed });
		reset();
	};

	let wasOpen = open;

	$effect(() => {
		if (wasOpen && !open) {
			dispatch('close');
			reset();
		}
		wasOpen = open;
	});

	const onKey = (event: KeyboardEvent) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			open = true;
		}
	};

	onMount(() => {
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header class="gap-2">
			<Dialog.Title>Dispatch task</Dialog.Title>
			<Dialog.Description>
				Type a command like `@porter opencode owner/repo#123 --priority high`.
			</Dialog.Description>
			<Button variant="ghost" size="icon" type="button" aria-label="Close" onclick={() => (open = false)}>
				<X size={16} />
			</Button>
		</Dialog.Header>

		<div class="space-y-3">
			<div class="rounded-lg border border-border bg-background px-3 py-2 text-sm">
				<div class="flex items-center gap-2 text-muted-foreground">
					<Command size={16} />
					<input
						class="flex-1 bg-transparent text-foreground outline-none"
						placeholder="@porter opencode owner/repo#123 --priority high"
						bind:value={command}
						oninput={(event) => parseCommand((event.target as HTMLInputElement).value)}
						onkeydown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								handleSubmit();
							}
						}}
					/>
				</div>
			</div>
			{#if error}
				<p class="text-xs text-destructive">{error}</p>
			{/if}
			{#if parsed}
				<div class="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
					<div class="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">{parsed.agent}</Badge>
						<span class="text-muted-foreground">
							{parsed.repoOwner}/{parsed.repoName}#{parsed.issueNumber}
						</span>
					</div>
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<span>Priority:</span>
						<span class="font-mono">{parsed.priority}</span>
					</div>
					{#if parsed.prompt}
						<p class="text-xs text-muted-foreground">Prompt: {parsed.prompt}</p>
					{/if}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex flex-wrap gap-2">
			<Button variant="secondary" type="button" onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button type="button" onclick={handleSubmit} disabled={!parsed || !!error}>
				<Check size={14} />
				Confirm dispatch
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
