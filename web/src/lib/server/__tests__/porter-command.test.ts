import { describe, expect, it } from 'vitest';

import { parsePorterCommand } from '$lib/server/porter-command';

describe('parsePorterCommand', () => {
	it('parses agent and priority', () => {
		const parsed = parsePorterCommand('@porter claude-code --priority=high');
		expect(parsed).toEqual({
			agent: 'claude-code',
			priority: 'high',
			extraInstructions: ''
		});
	});

	it('defaults to opencode and normal priority', () => {
		const parsed = parsePorterCommand('@porter');
		expect(parsed).toEqual({
			agent: 'opencode',
			priority: 'normal',
			extraInstructions: ''
		});
	});

	it('extracts extra instructions', () => {
		const parsed = parsePorterCommand('@porter opencode --priority=low please focus on tests');
		expect(parsed).toEqual({
			agent: 'opencode',
			priority: 'low',
			extraInstructions: 'please focus on tests'
		});
	});

	it('returns null when no mention is present', () => {
		expect(parsePorterCommand('hello world')).toBeNull();
	});
});
