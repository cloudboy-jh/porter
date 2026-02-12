export type ParsedPorterCommand = {
	agent: string;
	agentExplicit: boolean;
	priority: 'low' | 'normal' | 'high';
	extraInstructions: string;
};

const commandPattern = /@porter\b([\s\S]*)/i;
const priorityPattern = /--priority=(low|normal|high)/i;
const knownAgents = new Set(['opencode', 'claude', 'claude-code', 'amp', 'mock']);

export const parsePorterCommand = (commentBody: string): ParsedPorterCommand | null => {
	const match = commandPattern.exec(commentBody ?? '');
	if (!match) return null;

	const remainder = (match[1] ?? '').trim();
	const tokens = remainder ? remainder.split(/\s+/) : [];
	const firstToken = tokens[0]?.toLowerCase();
	const agentExplicit = Boolean(firstToken && knownAgents.has(firstToken));
	const requestedAgent = agentExplicit ? firstToken! : 'opencode';
	const instructionSource = agentExplicit ? tokens.slice(1).join(' ') : remainder;

	const priorityMatch = instructionSource.match(priorityPattern);
	const priority = (priorityMatch?.[1]?.toLowerCase() ?? 'normal') as ParsedPorterCommand['priority'];
	const extraInstructions = instructionSource.replace(priorityPattern, '').trim();

	return {
		agent: requestedAgent,
		agentExplicit,
		priority,
		extraInstructions
	};
};
