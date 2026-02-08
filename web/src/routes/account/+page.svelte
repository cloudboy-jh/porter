<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ArrowSquareOut, GithubLogo, ShieldCheck, UserCircle } from 'phosphor-svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const sessionUser = data?.session?.user;

	let user = $state({
		name: sessionUser?.name ?? sessionUser?.login ?? 'GitHub user',
		handle: sessionUser?.login ? `@${sessionUser.login}` : 'Not connected',
		email: sessionUser?.email ?? 'Email unavailable',
		role: 'Workspace Admin'
	});

	let github = $state({
		connected: Boolean(sessionUser),
		handle: sessionUser?.login ? `@${sessionUser.login}` : 'Not connected',
		lastSync: 'Just now',
		orgCount: 0,
		repoCount: 0,
		installationCount: 0
	});

	const workspace = {
		name: 'Porter Labs',
		plan: 'Pro',
		seats: '8/12 seats used'
	};

	const security = {
		lastLogin: 'Today at 8:14 AM',
		location: 'San Francisco, CA',
		sessions: '3 active sessions'
	};

	onMount(async () => {
		if (!sessionUser) return;
		try {
			const response = await fetch('/api/github/summary');
			if (!response.ok) return;
			const payload = (await response.json()) as {
				user: { login: string; name: string | null; avatarUrl: string; email?: string | null };
				organizations: Array<{ login: string }>;
				repositories: Array<{ id: number }>;
				installations: Array<{ id: number }>;
			};
			user = {
				...user,
				name: payload.user.name ?? payload.user.login,
				handle: `@${payload.user.login}`,
				email: payload.user.email ?? user.email
			};
			github = {
				...github,
				connected: true,
				handle: `@${payload.user.login}`,
				lastSync: 'Just now',
				orgCount: payload.organizations.length,
				repoCount: payload.repositories.length,
				installationCount: payload.installations.length
			};
		} catch {
			console.error('Failed to load GitHub summary');
		}
	});
</script>

<div class="w-full max-w-[1200px] mx-auto space-y-6">
	<section class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
		<Card.Root>
			<Card.Header class="pb-3">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/60">
							<UserCircle size={18} weight="bold" />
						</div>
						<div class="space-y-1">
							<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Account
							</p>
							<h2 class="text-lg font-semibold text-foreground">Profile Overview</h2>
						</div>
					</div>
					<Badge variant="secondary" class="text-xs">
						{user.role}
					</Badge>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="rounded-lg border border-border/60 bg-muted/30 p-4">
					<p class="text-sm font-medium text-foreground">{user.name}</p>
					<p class="text-xs text-muted-foreground">{user.handle}</p>
					<p class="mt-2 text-xs text-muted-foreground">{user.email}</p>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="rounded-lg border border-border/60 bg-background/70 p-3">
						<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Role</p>
						<p class="text-sm font-medium">{user.role}</p>
					</div>
					<div class="rounded-lg border border-border/60 bg-background/70 p-3">
						<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
						<p class="text-sm font-medium">{workspace.name}</p>
					</div>
				</div>
				<p class="text-xs text-muted-foreground">
					Profile details are managed by your workspace administrator.
				</p>
			</Card.Content>
			<Card.Footer class="flex flex-wrap gap-2">
				<Button variant="outline" onclick={() => goto('/settings')}>
					Open Settings
				</Button>
			</Card.Footer>
		</Card.Root>

		<Card.Root class="border border-border/60 bg-card/80">
			<Card.Header class="pb-3">
				<div class="flex items-start gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-muted-foreground">
						<GithubLogo size={18} weight="bold" />
					</div>
					<div class="space-y-1">
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Connection
						</p>
						<h2 class="text-lg font-semibold text-foreground">GitHub Access</h2>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="rounded-lg border border-border/60 bg-background/80 p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium">
								{github.connected ? 'Connected' : 'Disconnected'}
							</p>
							<p class="text-xs text-muted-foreground">
								{github.connected ? `Signed in as ${github.handle}` : 'Connect to sync repos'}
							</p>
						</div>
						<Badge variant={github.connected ? 'secondary' : 'outline'} class="text-xs">
							{github.connected ? 'Active' : 'Inactive'}
						</Badge>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">Last synced {github.lastSync}</p>
				</div>
				<div class="grid gap-3">
				<div class="rounded-lg border border-border/60 bg-background/70 p-3">
					<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Scopes</p>
					<p class="text-sm">Issues, PRs, Repository contents, Organizations</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{github.repoCount} repos • {github.orgCount} orgs • {github.installationCount} installs
					</p>
				</div>
					<div class="rounded-lg border border-border/60 bg-background/70 p-3">
						<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Audit</p>
						<p class="text-sm">Last authorization review 2 days ago</p>
					</div>
				</div>
			</Card.Content>
			<Card.Footer class="flex flex-wrap gap-2">
				<Button variant="secondary">
					Manage GitHub App
					<ArrowSquareOut size={14} weight="bold" />
				</Button>
				<Button variant="outline">Disconnect</Button>
			</Card.Footer>
		</Card.Root>
	</section>

	<section class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header class="pb-3">
				<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
				<h2 class="text-lg font-semibold text-foreground">Plan & Usage</h2>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="rounded-lg border border-border/60 bg-background/70 p-3">
					<p class="text-sm font-medium">{workspace.plan} Plan</p>
					<p class="text-xs text-muted-foreground">{workspace.seats}</p>
				</div>
				<div class="rounded-lg border border-border/60 bg-background/70 p-3">
					<p class="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Billing Owner</p>
					<p class="text-sm">Porter Labs Finance</p>
				</div>
			</Card.Content>
			<Card.Footer class="flex flex-wrap gap-2">
				<Button variant="secondary">Manage Billing</Button>
				<Button variant="outline">Invite Members</Button>
			</Card.Footer>
		</Card.Root>

		<Card.Root>
			<Card.Header class="pb-3">
				<div class="flex items-start gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-muted-foreground">
						<ShieldCheck size={18} weight="bold" />
					</div>
					<div>
						<p class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Security</p>
						<h2 class="text-lg font-semibold text-foreground">Session Activity</h2>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="rounded-lg border border-border/60 bg-background/70 p-3">
					<p class="text-sm font-medium">Last Login</p>
					<p class="text-xs text-muted-foreground">{security.lastLogin} • {security.location}</p>
				</div>
				<div class="rounded-lg border border-border/60 bg-background/70 p-3">
					<p class="text-sm font-medium">Active Sessions</p>
					<p class="text-xs text-muted-foreground">{security.sessions}</p>
				</div>
			</Card.Content>
			<Card.Footer class="flex flex-wrap gap-2">
				<Button variant="secondary">View Sessions</Button>
				<Button variant="outline">Sign out everywhere</Button>
			</Card.Footer>
		</Card.Root>
	</section>
</div>
