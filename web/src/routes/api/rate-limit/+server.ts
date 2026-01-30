import { json } from '@sveltejs/kit';
import { getRateLimitStatus } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const status = getRateLimitStatus();
	const resetDate = new Date(status.reset * 1000);
	const now = Date.now();
	const minutesUntilReset = Math.ceil((status.reset * 1000 - now) / 60000);
	
	return json({
		remaining: status.remaining,
		reset: status.reset,
		resetTime: resetDate.toISOString(),
		minutesUntilReset: minutesUntilReset > 0 ? minutesUntilReset : 0,
		isLow: status.isLow
	});
};
