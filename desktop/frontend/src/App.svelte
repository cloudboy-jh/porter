<script>
	import { onDestroy, onMount } from 'svelte';
	import { WindowGetSize, WindowSetSize } from '../wailsjs/runtime/runtime.js';

	let isDark = true;

	const applyTheme = () => {
		document.body.classList.toggle('light', !isDark);
		document.documentElement.classList.toggle('light', !isDark);
	};

	const persistTheme = () => {
		if (typeof localStorage === 'undefined') {
			return;
		}
		localStorage.setItem('porter-theme', isDark ? 'dark' : 'light');
	};

	const loadTheme = () => {
		if (typeof localStorage === 'undefined') {
			applyTheme();
			return;
		}
		const saved = localStorage.getItem('porter-theme');
		if (saved === 'light') {
			isDark = false;
		}
		applyTheme();
	};

	const toggleTheme = () => {
		isDark = !isDark;
		applyTheme();
		persistTheme();
	};

	let cleanupResize = null;

	onMount(() => {
		loadTheme();
		const applyStoredSize = async () => {
			if (typeof localStorage === 'undefined') {
				return;
			}
			const stored = localStorage.getItem('porter-window-size');
			if (!stored) {
				return;
			}
			try {
				const parsed = JSON.parse(stored);
				if (parsed && parsed.width && parsed.height) {
					await WindowSetSize(parsed.width, parsed.height);
				}
			} catch {
				// ignore malformed size
			}
		};
		const handleResize = async () => {
			if (typeof localStorage === 'undefined') {
				return;
			}
			const size = await WindowGetSize();
			localStorage.setItem('porter-window-size', JSON.stringify(size));
		};

		applyStoredSize();
		window.addEventListener('resize', handleResize);
		cleanupResize = () => window.removeEventListener('resize', handleResize);
	});

	onDestroy(() => {
		cleanupResize?.();
	});
</script>


<div class="app">
	<div class="shell">
		<header class="shell-header">
			<div class="header-left">
				<div class="brand">
					<img src="/porter-logo-main.png" alt="Porter" />
				</div>
				<div>
					<div class="shell-title">Porter</div>
					<div class="shell-subtitle">Desktop daemon</div>
				</div>
			</div>
			<div class="header-actions">
				<button class="toggle" type="button" on:click={toggleTheme} aria-label="Toggle theme">
					{#if isDark}
						<span class="toggle-icon">☾</span>
					{:else}
						<span class="toggle-icon">☀</span>
					{/if}
				</button>
			</div>
		</header>
		<div class="shell-body">
			<section class="panel">
				<div class="task-title">Current Task</div>
				<div class="task-meta">Add user auth system</div>
				<div class="task-meta font-mono">porter #42 · opencode</div>
				<div class="progress"><span></span></div>
				<div class="progress-label font-mono">65% complete</div>
				<div class="button-row">
					<button class="danger">Stop</button>
					<button>Restart</button>
					<button class="primary">View in GitHub</button>
				</div>

				<div class="panel panel-inner" style="margin-top: 20px;">
					<div class="section-title">Logs</div>
					<div class="logs">
						<div class="log-line">
							<span class="log-time">14:32:01</span>
							<span class="log-level info">INFO</span>
							<span>Starting task execution</span>
						</div>
						<div class="log-line">
							<span class="log-time">14:32:03</span>
							<span class="log-level info">INFO</span>
							<span>Analyzing codebase structure</span>
						</div>
						<div class="log-line">
							<span class="log-time">14:32:08</span>
							<span class="log-level info">INFO</span>
							<span>Found 23 relevant files</span>
						</div>
						<div class="log-line">
							<span class="log-time">14:32:18</span>
							<span class="log-level success">SUCCESS</span>
							<span>Created src/auth/provider.ts</span>
						</div>
					</div>
				</div>
			</section>

			<aside class="panel">
				<div class="task-title">Metrics</div>
				<div class="metric-grid">
					<div class="metric">
						<div class="value">12</div>
						<div class="label">Tasks today</div>
					</div>
					<div class="metric">
						<div class="value">87%</div>
						<div class="label">Success</div>
					</div>
					<div class="metric">
						<div class="value">8m</div>
						<div class="label">Avg time</div>
					</div>
					<div class="metric">
						<div class="value">4h</div>
						<div class="label">Uptime</div>
					</div>
				</div>

				<div class="panel panel-inner" style="margin-top: 20px;">
					<div class="section-title">Queue (1)</div>
					<div class="queue">
						<div class="queue-row">
							<span class="status-dot idle"></span>
							<span>Fix memory leak · churn #128</span>
						</div>
					</div>
				</div>

				<div class="panel panel-inner" style="margin-top: 20px;">
					<div class="section-title">Agents</div>
					<div class="queue">
						<div class="agent-row">
							<span class="status-dot"></span>
							<span>opencode · Active</span>
						</div>
						<div class="agent-row">
							<span class="status-dot idle"></span>
							<span>cursor · Idle</span>
						</div>
					</div>
				</div>
			</aside>
		</div>

		<div class="status-bar">
			<div class="status-group">
				<span class="status-dot"></span>
				<span>Connected</span>
			</div>
			<span class="font-mono">ws://localhost:3000</span>
			<span class="font-mono">4h uptime</span>
		</div>
	</div>
</div>
