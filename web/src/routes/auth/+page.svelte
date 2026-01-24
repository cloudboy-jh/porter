<script lang="ts">
	import { GithubLogo, ShieldCheck, Sparkle } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import logo from '../../logos/porter-logo-main.png';
</script>

<div class="flex min-h-[70vh] items-center justify-center">
	<div class="w-full max-w-4xl space-y-8">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<img src={logo} alt="Porter" class="h-10 w-10 rounded-xl border border-border/60 bg-background/70 p-1" />
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Porter</p>
					<p class="text-sm font-medium text-foreground">Workspace access</p>
				</div>
			</div>
			<div class="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
				<Sparkle size={14} weight="bold" class="text-primary" />
				Cloud-only execution, no local setup
			</div>
		</div>

		<Card.Root class="border border-border/60 bg-card/70 shadow-[0_20px_40px_-28px_rgba(15,15,15,0.5)]">
			<Card.Content class="grid gap-8 p-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
				<div class="space-y-4">
					<p class="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Sign in / Sign up</p>
					<h1 class="text-2xl font-semibold text-foreground">Connect Porter to GitHub</h1>
					<p class="text-sm text-muted-foreground">
						Use GitHub to sign in or create your Porter workspace. We will sync your profile and
						configure repos + agents automatically after authorization.
					</p>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<span class="h-2 w-2 rounded-full bg-primary/70"></span>
							Auto-pick agents per repo and priority
						</li>
						<li class="flex items-center gap-2">
							<span class="h-2 w-2 rounded-full bg-primary/70"></span>
							Track every task, status, and PR in one feed
						</li>
						<li class="flex items-center gap-2">
							<span class="h-2 w-2 rounded-full bg-primary/70"></span>
							Cloud execution only — no local daemons required
						</li>
					</ul>
					<div class="flex flex-wrap gap-3">
						<Button size="lg" class="gap-2" href="/api/auth/github">
							<GithubLogo size={18} weight="bold" />
							Continue with GitHub
						</Button>
						<Button variant="secondary" size="lg">Preview workflow</Button>
					</div>
					<p class="text-xs text-muted-foreground">
						If the GitHub App is not installed, we will redirect you to install it.
					</p>
				</div>
				<div class="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-6">
					<div class="flex items-center gap-3 text-sm font-medium">
						<span class="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/70">
							<ShieldCheck size={18} weight="bold" class="text-muted-foreground" />
						</span>
						Permissions summary
					</div>
					<ul class="space-y-3 text-xs text-muted-foreground">
						<li>Reads repository metadata and issue details</li>
						<li>Creates branches, commits, and pull requests</li>
						<li>Uses GitHub App webhooks for dispatch</li>
						<li>Never runs locally — all tasks execute in the cloud</li>
					</ul>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-2xl border border-border/60 bg-background/70 p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 01</p>
				<p class="mt-2 text-sm font-medium text-foreground">Authorize GitHub</p>
				<p class="mt-2 text-xs text-muted-foreground">Connect your account and verify access.</p>
			</div>
			<div class="rounded-2xl border border-border/60 bg-background/70 p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 02</p>
				<p class="mt-2 text-sm font-medium text-foreground">Install GitHub App</p>
				<p class="mt-2 text-xs text-muted-foreground">Enable repo-level automation and webhooks.</p>
			</div>
			<div class="rounded-2xl border border-border/60 bg-background/70 p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 03</p>
				<p class="mt-2 text-sm font-medium text-foreground">Choose agents</p>
				<p class="mt-2 text-xs text-muted-foreground">Pick the assistants Porter should run.</p>
			</div>
		</div>
	</div>
</div>
