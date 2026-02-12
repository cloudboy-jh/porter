<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SignInForm from '$lib/components/SignInForm.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const isConnected = $derived(Boolean(data?.session));
	const githubHandle = $derived(data?.session?.user?.login ?? '');
	const authErrorCode = $derived($page.url.searchParams.get('error') ?? '');
	const githubAppInstallUrl = $derived(data?.githubAppInstallUrl ?? null);
	let canvasEl: HTMLCanvasElement | null = $state(null);
	let isSigningOut = $state(false);

	const signOut = async () => {
		if (isSigningOut) return;
		isSigningOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			window.location.href = '/auth';
		} catch {
			window.location.href = '/auth';
		} finally {
			isSigningOut = false;
		}
	};

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

			ctx.fillStyle = 'rgb(10, 10, 10)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.fillStyle = 'rgba(201, 85, 0, 0.85)';
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

			time += 0.036;
			frameId = requestAnimationFrame(draw);
		};

		draw();

		return () => {
			window.removeEventListener('resize', updateCanvasSize);
			cancelAnimationFrame(frameId);
		};
	});
</script>

<div class="relative min-h-svh bg-[#0a0a0a] text-[#d9d4cf]">
	<!-- Background canvas animation -->
	<div class="absolute inset-0">
		<canvas bind:this={canvasEl} class="absolute inset-0 h-full w-full"></canvas>
		<div class="pointer-events-none absolute inset-0 opacity-20">
			<div class="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] bg-[length:100%_4px]"></div>
		</div>
	</div>

	<!-- Sign-in card -->
	<div class="relative z-10 flex min-h-svh items-center justify-center p-4 md:p-8">
		<div class="w-full max-w-[560px]">
			<div class="rounded-xl border border-white/10 bg-[#141210]/95 shadow-[0_30px_70px_-45px_rgba(0,0,0,0.6)] backdrop-blur-[1px]">
				<SignInForm 
					{isConnected} 
					{githubHandle} 
					{isSigningOut} 
					{authErrorCode}
					{githubAppInstallUrl}
					onSignOut={signOut} 
				/>
			</div>
		</div>
	</div>
</div>
