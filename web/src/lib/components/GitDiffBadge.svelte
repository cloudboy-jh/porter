<script lang="ts">
	export let variant: 'add' | 'remove';
	export let value = 0;

	const styles: Record<'add' | 'remove', string> = {
		add: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600',
		remove: 'border-rose-500/30 bg-rose-500/15 text-rose-600'
	};

	const prefixes: Record<'add' | 'remove', string> = {
		add: '+',
		remove: '-'
	};
</script>

<span
	class={`inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-xs ${styles[variant]}`}
>
	{prefixes[variant]}{value}
</span>
