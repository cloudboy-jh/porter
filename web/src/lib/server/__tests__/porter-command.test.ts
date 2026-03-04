import { describe, expect, it } from 'vitest';

import { parsePorterCommand } from '$lib/server/porter-command';

describe('parsePorterCommand', () => {
	it('parses model and priority', () => {
		const parsed = parsePorterCommand('@porter --model=anthropic/claude-sonnet-4 --priority=high');
		expect(parsed).toEqual({
			model: 'anthropic/claude-sonnet-4',
			modelExplicit: true,
			priority: 'high',
			extraInstructions: ''
		});
	});

	it('defaults to configured model and normal priority', () => {
		const parsed = parsePorterCommand('@porter');
		expect(parsed).toEqual({
			model: 'anthropic/claude-sonnet-4',
			modelExplicit: false,
			priority: 'normal',
			extraInstructions: ''
		});
	});

	it('extracts extra instructions', () => {
		const parsed = parsePorterCommand('@porter --model=openai/gpt-4.1 --priority=low please focus on tests');
		expect(parsed).toEqual({
			model: 'openai/gpt-4.1',
			modelExplicit: true,
			priority: 'low',
			extraInstructions: 'please focus on tests'
		});
	});

	it('treats plain first token as instructions', () => {
		const parsed = parsePorterCommand('@porter please fix login race condition');
		expect(parsed).toEqual({
			model: 'anthropic/claude-sonnet-4',
			modelExplicit: false,
			priority: 'normal',
			extraInstructions: 'please fix login race condition'
		});
	});

	it('returns null when no mention is present', () => {
		expect(parsePorterCommand('hello world')).toBeNull();
	});
});
