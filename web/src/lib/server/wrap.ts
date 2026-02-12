type BuildWrapPromptInput = {
	issueTitle: string;
	issueBody: string;
	issueNumber: number;
	agent: string;
	extraInstructions?: string;
	agentsMd?: string | null;
};

export const buildWrapPrompt = (input: BuildWrapPromptInput) => {
	const sections: string[] = [];

	sections.push('## Task');
	sections.push(input.issueTitle.trim() || `Issue #${input.issueNumber}`);
	sections.push('');

	sections.push('## Description');
	sections.push(input.issueBody.trim() || 'No issue description provided.');
	sections.push('');

	if (input.agentsMd?.trim()) {
		sections.push('## Repository Context');
		sections.push('The repository AGENTS.md guidance is below. Follow it when making changes.');
		sections.push('');
		sections.push(input.agentsMd.trim());
		sections.push('');
	}

	sections.push('## Execution Contract');
	sections.push(`- Agent: ${input.agent}`);
	sections.push(`- Target issue: #${input.issueNumber}`);
	sections.push('- Make focused code changes that solve the issue.');
	sections.push('- Commit your changes to the current branch.');
	sections.push('- Do not open a pull request. Porter will create or link the PR.');
	sections.push('');

	if (input.extraInstructions?.trim()) {
		sections.push('## Additional Instructions');
		sections.push(input.extraInstructions.trim());
		sections.push('');
	}

	sections.push('## Output Expectations');
	sections.push('- Keep changes minimal and production-ready.');
	sections.push('- If blocked, explain the blocker clearly in the final response.');

	return sections.join('\n');
};
