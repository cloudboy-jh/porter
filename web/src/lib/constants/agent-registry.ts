export type AgentRegistryEntry = {
	id: string;
	displayName: string;
	provider: string;
	requiredKeys: string[];
	description: string;
	docsUrl?: string;
};

export const AGENT_REGISTRY: AgentRegistryEntry[] = [
	{
		id: 'opencode',
		displayName: 'Opencode',
		provider: 'Anthropic',
		requiredKeys: ['anthropic'],
		description: 'Fast cloud agent for day-to-day issues.',
		docsUrl: 'https://opencode.ai'
	},
	{
		id: 'claude-code',
		displayName: 'Claude Code',
		provider: 'Anthropic',
		requiredKeys: ['anthropic'],
		description: 'Deep reasoning agent for complex refactors.',
		docsUrl: 'https://www.anthropic.com'
	},
	{
		id: 'amp',
		displayName: 'Amp',
		provider: 'Anthropic',
		requiredKeys: ['amp'],
		description: 'High throughput agent for rapid iteration.',
		docsUrl: 'https://ampcode.com'
	}
];

export const AGENT_REGISTRY_MAP = AGENT_REGISTRY.reduce<Record<string, AgentRegistryEntry>>(
	(acc, entry) => {
		acc[entry.id] = entry;
		return acc;
	},
	{}
);
