<script lang="ts">
	import { GithubLogo, ShieldCheck } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
</script>

<div class="flex min-h-[70vh] items-center justify-center">
	<div class="w-full max-w-3xl space-y-6">
		<Card.Root class="border border-border/60 bg-card/70 shadow-[0_20px_40px_-28px_rgba(15,15,15,0.5)]">
			<Card.Content class="grid gap-8 p-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
				<div class="space-y-4">
					<p class="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Sign in</p>
					<h1 class="text-2xl font-semibold text-foreground">Connect Porter to GitHub</h1>
					<p class="text-sm text-muted-foreground">
						Authorize Porter to run agents, open PRs, and keep your tasks moving while you stay focused.
					</p>
					<div class="flex flex-wrap gap-3">
						<Button size="lg" class="gap-2" href="/api/auth/github">
							<GithubLogo size={18} weight="bold" />
							Continue with GitHub
						</Button>
						<Button variant="secondary" size="lg">See how it works</Button>
					</div>
				</div>
				<div class="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-6">
					<div class="flex items-center gap-3 text-sm font-medium">
						<span class="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/70">
							<ShieldCheck size={18} weight="bold" class="text-muted-foreground" />
						</span>
						Trusted permissions
					</div>
					<ul class="space-y-3 text-xs text-muted-foreground">
						<li>Reads repository metadata and issue details</li>
						<li>Creates branches and pull requests</li>
						<li>Never runs locally — all tasks execute in the cloud</li>
					</ul>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-2xl border border-border/60 bg-background/70 p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 01</p>
				<p class="mt-2 text-sm font-medium text-foreground">Authorize GitHub</p>
				<p class="mt-2 text-xs text-muted-foreground">Grant Porter access to issues and PRs.</p>
			</div>
			<div class="rounded-2xl border border-border/60 bg-background/70 p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 02</p>
				<p class="mt-2 text-sm font-medium text-foreground">Pick repositories</p>
				<p class="mt-2 text-xs text-muted-foreground">Choose where Porter will listen for tasks.</p>
			</div>
			<div class="rounded-2xl border border-border/60 bg-background/70 p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 03</p>
				<p class="mt-2 text-sm font-medium text-foreground">Select agents</p>
				<p class="mt-2 text-xs text-muted-foreground">Enable the coding assistants you trust.</p>
			</div>
		</div>
	</div>
</div>
