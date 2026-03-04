export type ParsedPorterCommand = {
	model: string;
	modelExplicit: boolean;
	priority: 'low' | 'normal' | 'high';
	extraInstructions: string;
};

const commandPattern = /@porter\b([\s\S]*)/i;
const priorityPattern = /--priority=(low|normal|high)/i;
const modelPattern = /--model=([^\s]+)/i;

export const parsePorterCommand = (commentBody: string): ParsedPorterCommand | null => {
	const match = commandPattern.exec(commentBody ?? '');
	if (!match) return null;

	const remainder = (match[1] ?? '').trim();
	const modelMatch = remainder.match(modelPattern);
	const requestedModel = modelMatch?.[1]?.trim() || 'anthropic/claude-sonnet-4';
	const modelExplicit = Boolean(modelMatch?.[1]?.trim());
	const instructionSource = remainder.replace(modelPattern, '').trim();

	const priorityMatch = instructionSource.match(priorityPattern);
	const priority = (priorityMatch?.[1]?.toLowerCase() ?? 'normal') as ParsedPorterCommand['priority'];
	const extraInstructions = instructionSource.replace(priorityPattern, '').trim();

	return {
		model: requestedModel,
		modelExplicit,
		priority,
		extraInstructions
	};
};
