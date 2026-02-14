type LogLevel = 'info' | 'warn' | 'error';

const logWithLevel = (level: LogLevel, line: string) => {
	if (level === 'error') {
		console.error(line);
		return;
	}
	if (level === 'warn') {
		console.warn(line);
		return;
	}
	console.log(line);
};

export const serializeError = (error: unknown) => {
	if (error instanceof Error) {
		const details = error as Error & {
			status?: number;
			body?: string;
			meta?: unknown;
		};
		return {
			name: details.name,
			message: details.message,
			status: details.status,
			body: typeof details.body === 'string' ? details.body.slice(0, 500) : undefined,
			meta: details.meta,
			stack: details.stack?.split('\n').slice(0, 5).join('\n')
		};
	}
	return {
		type: typeof error,
		value: String(error)
	};
};

export const logEvent = (
	level: LogLevel,
	scope: string,
	event: string,
	data: Record<string, unknown> = {}
) => {
	const line = JSON.stringify({
		ts: new Date().toISOString(),
		level,
		scope,
		event,
		...data
	});
	logWithLevel(level, line);
};

export const tokenFingerprint = (token?: string | null) => {
	if (!token) return null;
	return `${token.slice(0, 4)}...${token.slice(-4)}`;
};
