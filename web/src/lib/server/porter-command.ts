export type ParsedPorterCommand = {
	agent: string;
	priority: 'low' | 'normal' | 'high';
	extraInstructions: string;
};

const commandPattern = /@porter(?:\s+([^\s]+))?([\s\S]*)/i;
const priorityPattern = /--priority=(low|normal|high)/i;

export const parsePorterCommand = (commentBody: string): ParsedPorterCommand | null => {
	const match = commandPattern.exec(commentBody ?? '');
	if (!match) return null;

	const requestedAgent = match[1]?.trim() || 'opencode';
	const remainder = (match[2] ?? '').trim();
	const priorityMatch = remainder.match(priorityPattern);
	const priority = (priorityMatch?.[1]?.toLowerCase() ?? 'normal') as ParsedPorterCommand['priority'];
	const extraInstructions = remainder.replace(priorityPattern, '').trim();

	return {
		agent: requestedAgent,
		priority,
		extraInstructions
	};
};
