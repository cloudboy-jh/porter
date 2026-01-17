import type { RecentCommand } from '$lib/types/agent';

const STORAGE_KEY = 'porter-recent-commands';
const MAX_RECENT_COMMANDS = 10;

export function getRecentCommands(): RecentCommand[] {
	if (typeof localStorage === 'undefined') return [];
	
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		return JSON.parse(stored) as RecentCommand[];
	} catch {
		return [];
	}
}

export function addRecentCommand(command: Omit<RecentCommand, 'id' | 'timestamp'>): void {
	if (typeof localStorage === 'undefined') return;
	
	const recent = getRecentCommands();
	const newCommand: RecentCommand = {
		...command,
		id: crypto.randomUUID(),
		timestamp: Date.now()
	};
	
	// Add to front, remove duplicates, limit to MAX_RECENT_COMMANDS
	const updated = [
		newCommand,
		...recent.filter(
			(cmd) =>
				!(
					cmd.agent === command.agent &&
					cmd.repository === command.repository &&
					cmd.issue === command.issue
				)
		)
	].slice(0, MAX_RECENT_COMMANDS);
	
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
	} catch {
		// localStorage full or unavailable
	}
}

export function clearRecentCommands(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}

export function formatTimeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	
	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}
