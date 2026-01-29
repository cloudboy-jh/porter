<script lang="ts">
	import { onMount } from 'svelte';
	import { GithubLogo, Stack } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { PageData } from './$types';
	import logo from '../../logos/porter-logo-main.png';

	let { data } = $props<{ data: PageData }>();
	const isConnected = $derived(Boolean(data?.session));
	let canvasEl: HTMLCanvasElement | null = $state(null);

	onMount(() => {
		const canvas = canvasEl;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const updateCanvasSize = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		};

		updateCanvasSize();
		window.addEventListener('resize', updateCanvasSize);

		const characters = ' .:-=+*#%@'.split('');
		let time = 0;
		let frameId = 0;

		const draw = () => {
			const cols = Math.floor(canvas.width / 14);
			const rows = Math.floor(canvas.height / 24);

			ctx.fillStyle = 'rgb(194, 78, 0)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.fillStyle = 'rgba(255, 245, 235, 0.9)';
			ctx.font =
				'11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

			for (let i = 0; i < cols; i += 1) {
				for (let j = 0; j < rows; j += 1) {
					const x = i * 14;
					const y = j * 24;
					const distortionX = Math.sin(time * 0.1 + j * 0.2) * 3;
					const distortionY = Math.cos(time * 0.1 + i * 0.2) * 2;
					const gray = (Math.sin(x * 0.01 + distortionX) + Math.cos(y * 0.01 + distortionY) + 2) / 4;
					const charIndex = Math.floor(gray * (characters.length - 1));
					ctx.fillText(characters[charIndex], x, y);
				}
			}

			time += 0.06;
			frameId = requestAnimationFrame(draw);
		};

		draw();

		return () => {
			window.removeEventListener('resize', updateCanvasSize);
			cancelAnimationFrame(frameId);
		};
	});
</script>

<div class="grid min-h-svh bg-[radial-gradient(circle_at_top,rgba(255,140,0,0.08),transparent_45%),linear-gradient(180deg,rgba(255,248,240,0.9),rgba(247,244,240,1))] lg:grid-cols-2">
	<div class="relative hidden lg:block">
		<div class="absolute inset-0 bg-[#c95500]">
			<canvas bind:this={canvasEl} class="absolute inset-0 h-full w-full" />
			<div class="pointer-events-none absolute inset-0">
				<div class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,220,180,0.25),transparent_55%)]" />
				<div class="absolute inset-0 flex items-center justify-center">
					<div class="rounded-[28px] bg-white/80 p-[2px] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.55)]">
						<div class="rounded-[26px] border border-orange-200/70 bg-[#f7f4f0]/95 p-5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
							<img src={logo} alt="Porter" class="h-36 w-36 rounded-2xl" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="flex flex-col gap-6 p-6 md:p-10">
		<div class="flex justify-center md:justify-start">
			<div class="flex items-center gap-2 text-sm font-medium text-foreground">
				<img src={logo} alt="Porter" class="h-6 w-6 rounded-md" />
				Porter Cloud
			</div>
		</div>
		<div class="flex flex-1 items-center justify-center">
			<div class="w-full max-w-md space-y-8">
				<div class="space-y-2">
					<p class="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
						Sign in
					</p>
					<h1 class="text-3xl font-semibold text-foreground">Connect GitHub</h1>
					<p class="text-base text-muted-foreground">Use your GitHub account to access Porter.</p>
				</div>
				<div class="grid gap-5">
					<div class="flex items-start gap-3">
						<span class="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background text-primary">
							<GithubLogo size={18} weight="bold" />
						</span>
						<div>
							<p class="text-base font-medium text-foreground">Secure OAuth</p>
							<p class="text-sm text-muted-foreground">GitHub identity and permissions managed by you.</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<span class="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background text-primary">
							<Stack size={18} weight="bold" />
						</span>
						<div>
							<p class="text-base font-medium text-foreground">Repo control</p>
							<p class="text-sm text-muted-foreground">Choose repositories later from Settings.</p>
						</div>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-3">
					<Button size="lg" class="gap-2 shadow-[0_6px_20px_-12px_rgba(200,90,0,0.6)]" href="/api/auth/github">
						<GithubLogo size={18} weight="bold" />
						{isConnected ? 'Reconnect GitHub' : 'Continue with GitHub'}
					</Button>
					{#if isConnected}
						<Button variant="secondary" size="lg" href="/">
							Go to dashboard
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
