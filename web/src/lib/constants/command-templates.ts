import type { CommandTemplate } from '$lib/types/agent';

export const COMMAND_TEMPLATES: CommandTemplate[] = [
	{
		id: 'fix-bug',
		name: 'Fix Bug',
		description: 'Fix a bug with high priority',
		priority: 'high',
		promptTemplate: 'Fix the bug described in the issue. Ensure tests pass and add regression tests.'
	},
	{
		id: 'add-feature',
		name: 'Add Feature',
		description: 'Implement a new feature',
		priority: 'normal',
		promptTemplate: 'Implement the feature as described in the issue. Add tests and documentation.'
	},
	{
		id: 'refactor',
		name: 'Refactor Code',
		description: 'Refactor existing code',
		priority: 'normal',
		promptTemplate: 'Refactor the code as described. Maintain existing functionality and test coverage.'
	},
	{
		id: 'update-docs',
		name: 'Update Docs',
		description: 'Update documentation',
		priority: 'low',
		promptTemplate: 'Update documentation to reflect current implementation. Ensure examples are accurate.'
	},
	{
		id: 'write-tests',
		name: 'Write Tests',
		description: 'Add test coverage',
		priority: 'normal',
		promptTemplate: 'Add comprehensive test coverage for the functionality described in the issue.'
	}
];
