import { randomBytes } from 'crypto';

const FLY_API_BASE = 'https://api.machines.dev/v1';

export type FlySetupMode = 'org' | 'deploy';

export type FlyValidationStatus =
	| 'ready'
	| 'missing'
	| 'missing_token'
	| 'missing_app_name'
	| 'invalid_token'
	| 'insufficient_scope'
	| 'app_not_found'
	| 'name_conflict'
	| 'error';

export type FlyValidationResult = {
	ok: boolean;
	status: FlyValidationStatus;
	message: string;
	appCreated: boolean;
	flyAppName?: string;
	mode: FlySetupMode;
};

type FlyApp = {
	name: string;
	organization?: { slug?: string };
};

type FlyTokenInfo = {
	apps?: string[];
	org_slug?: string;
	organization?: string;
};

type FlyCurrentTokenResponse = {
	tokens?: FlyTokenInfo[];
};

type FlyMachineCreateRequest = {
	config: {
		image: string;
		auto_destroy: boolean;
		env?: Record<string, string>;
		guest?: {
			cpu_kind?: 'shared' | 'performance';
			cpus?: number;
			memory_mb?: number;
		};
	};
};

type FlyMachineCreateResponse = {
	id: string;
	state?: string;
};

type FlyApiError = {
	error?: string;
	message?: string;
	details?: unknown;
};

export class FlyRequestError extends Error {
	status: number;
	body: string;

	constructor(status: number, body: string) {
		super(`Fly request failed: ${status}`);
		this.name = 'FlyRequestError';
		this.status = status;
		this.body = body;
	}
}

const flyHeaders = (token: string, extra?: Record<string, string>) => ({
	Authorization: `Bearer ${token}`,
	'Content-Type': 'application/json',
	...(extra ?? {})
});

const parseErrorMessage = (body: string) => {
	try {
		const parsed = JSON.parse(body) as FlyApiError;
		return parsed.message ?? parsed.error ?? body;
	} catch {
		return body;
	}
};

const normalizeOrgSlug = (value?: string) => {
	if (!value) return undefined;
	const trimmed = value.trim().toLowerCase();
	return trimmed.length ? trimmed : undefined;
};

const toUniqueSorted = (values: string[]) =>
	Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
		a.localeCompare(b)
	);

const normalizeSetupMode = (mode?: FlySetupMode): FlySetupMode =>
	mode === 'deploy' ? 'deploy' : 'org';

const normalizeFlyAppName = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 63);

const generateFlyAppName = () => normalizeFlyAppName(`porter-${randomBytes(4).toString('hex')}`);

const flyFetch = async <T>(token: string, path: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(`${FLY_API_BASE}${path}`, {
		...init,
		headers: flyHeaders(token, (init?.headers ?? {}) as Record<string, string>)
	});

	if (!response.ok) {
		const body = await response.text();
		throw new FlyRequestError(response.status, body);
	}

	if (response.status === 204) {
		return {} as T;
	}

	return (await response.json()) as T;
};

export const getFlyApp = async (token: string, appName: string): Promise<FlyApp | null> => {
	try {
		return await flyFetch<FlyApp>(token, `/apps/${encodeURIComponent(appName)}`);
	} catch (error) {
		if (error instanceof FlyRequestError && error.status === 404) {
			return null;
		}
		throw error;
	}
};

const getCurrentTokenInfo = async (token: string): Promise<FlyTokenInfo[]> => {
	const payload = await flyFetch<FlyCurrentTokenResponse>(token, '/tokens/current');
	return Array.isArray(payload.tokens) ? payload.tokens : [];
};

const getScopedApps = (tokenInfo: FlyTokenInfo[]) =>
	toUniqueSorted(
		tokenInfo.flatMap((entry) =>
			(entry.apps ?? [])
				.map((appName) => normalizeFlyAppName(appName))
				.filter((appName) => appName.length > 0)
		)
	);

const pickOrgSlug = (tokenInfo: FlyTokenInfo[]) => {
	const slugs = toUniqueSorted(
		tokenInfo
			.map((entry) => normalizeOrgSlug(entry.org_slug))
			.filter((slug): slug is string => Boolean(slug))
	);
	if (!slugs.length) return undefined;
	if (slugs.includes('personal')) return 'personal';
	return slugs[0];
};

const formatScopedApps = (apps: string[]) => {
	if (!apps.length) return '';
	if (apps.length <= 3) return apps.join(', ');
	return `${apps.slice(0, 3).join(', ')}, +${apps.length - 3} more`;
};

export const createFlyApp = async (
	token: string,
	appName: string,
	orgSlug: string
): Promise<FlyApp> => {
	return flyFetch<FlyApp>(token, '/apps', {
		method: 'POST',
		body: JSON.stringify({ app_name: appName, org_slug: orgSlug })
	});
};

export const ensureFlyApp = async (token: string, appName: string, orgSlug: string) => {
	const existing = await getFlyApp(token, appName);
	if (existing) {
		return { app: existing, created: false };
	}
	const app = await createFlyApp(token, appName, orgSlug);
	return { app, created: true };
};

export const createFlyMachine = async (
	token: string,
	appName: string,
	payload: FlyMachineCreateRequest
): Promise<FlyMachineCreateResponse> => {
	return flyFetch<FlyMachineCreateResponse>(
		token,
		`/apps/${encodeURIComponent(appName)}/machines`,
		{
			method: 'POST',
			body: JSON.stringify(payload)
		}
	);
};

export const destroyFlyMachine = async (token: string, appName: string, machineId: string) => {
	return flyFetch<Record<string, unknown>>(
		token,
		`/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}`,
		{
			method: 'DELETE'
		}
	);
};

export const validateFlyCredentials = async (token: string, appName: string) => {
	return validateFlyCredentialsWithMode(token, appName, { mode: 'org' });
};

export const validateFlyCredentialsWithMode = async (
	token: string,
	appName: string,
	input?: { mode?: FlySetupMode }
): Promise<FlyValidationResult> => {
	const mode = normalizeSetupMode(input?.mode);
	const trimmedToken = token.trim();
	const trimmedApp = normalizeFlyAppName(appName);

	if (!trimmedToken) {
		return {
			ok: false,
			status: 'missing_token',
			message: 'Fly token is required.',
			appCreated: false,
			mode
		};
	}

	if (mode === 'deploy' && !trimmedApp) {
		try {
			const tokenInfo = await getCurrentTokenInfo(trimmedToken);
			const scopedApps = getScopedApps(tokenInfo);
			if (scopedApps.length === 1) {
				const scopedApp = scopedApps[0];
				const app = await getFlyApp(trimmedToken, scopedApp);
				if (app) {
					return {
						ok: true,
						status: 'ready',
						message: `Fly app ${app.name} is ready.`,
						appCreated: false,
						flyAppName: app.name,
						mode
					};
				}
			}
			return {
				ok: false,
				status: 'missing_app_name',
				message:
					scopedApps.length > 1
						? `Fly app name is required for this deploy token. Available apps: ${formatScopedApps(scopedApps)}.`
						: 'Fly app name is required when using an app deploy token.',
				appCreated: false,
				mode
			};
		} catch (error) {
			if (error instanceof FlyRequestError && error.status === 401) {
				return {
					ok: false,
					status: 'invalid_token',
					message: 'Invalid Fly token.',
					appCreated: false,
					mode
				};
			}
			if (error instanceof FlyRequestError && error.status === 403) {
				const details = parseErrorMessage(error.body);
				return {
					ok: false,
					status: 'insufficient_scope',
					message: details || 'Token cannot access Fly app details for this deploy setup.',
					appCreated: false,
					mode
				};
			}
			return {
				ok: false,
				status: 'missing_app_name',
				message: 'Fly app name is required when using an app deploy token.',
				appCreated: false,
				mode
			};
		}
	}

	let tokenInfo: FlyTokenInfo[] = [];
	try {
		tokenInfo = await getCurrentTokenInfo(trimmedToken);
	} catch (error) {
		if (error instanceof FlyRequestError && error.status === 401) {
			return {
				ok: false,
				status: 'invalid_token',
				message: 'Invalid Fly token.',
				appCreated: false,
				mode
			};
		}
		if (error instanceof FlyRequestError && error.status === 403) {
			const details = parseErrorMessage(error.body);
			return {
				ok: false,
				status: 'insufficient_scope',
				message:
					details ||
					'Token cannot access organization information. Use an org-scoped token from Fly.',
				appCreated: false,
				mode
			};
		}
	}

	const scopedApps = getScopedApps(tokenInfo);
	const orgSlug = pickOrgSlug(tokenInfo);

	if (!trimmedApp && mode === 'org' && !orgSlug && scopedApps.length > 1) {
		return {
			ok: false,
			status: 'missing_app_name',
			message:
				`This token is app-scoped. Set Fly app name to one of: ${formatScopedApps(scopedApps)}.`,
			appCreated: false,
			mode
		};
	}

	let candidateAppName = trimmedApp;
	if (!candidateAppName && mode === 'org' && scopedApps.length === 1) {
		candidateAppName = scopedApps[0];
	}
	if (!candidateAppName) {
		candidateAppName = generateFlyAppName();
	}

	const canRetryName = mode === 'org' && !trimmedApp && scopedApps.length === 0;
	const maxAttempts = canRetryName ? 3 : 1;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		try {
			if (mode === 'deploy') {
				const app = await getFlyApp(trimmedToken, candidateAppName);
				if (!app) {
					return {
						ok: false,
						status: 'app_not_found',
						message:
							'Fly app was not found for this deploy token. Use the exact app name linked to this token.',
						appCreated: false,
						flyAppName: candidateAppName,
						mode
					};
				}

				return {
					ok: true,
					status: 'ready',
					message: `Fly app ${app.name} is ready.`,
					appCreated: false,
					flyAppName: app.name,
					mode
				};
			}

			if (!orgSlug) {
				const app = await getFlyApp(trimmedToken, candidateAppName);
				if (app) {
					return {
						ok: true,
						status: 'ready',
						message: `Fly app ${app.name} is ready.`,
						appCreated: false,
						flyAppName: app.name,
						mode
					};
				}
				return {
					ok: false,
					status: 'insufficient_scope',
					message:
						scopedApps.length > 0
							? `Token can access existing app(s) only. Set Fly app name to one of: ${formatScopedApps(scopedApps)}.`
							: 'Token cannot create Fly apps because no organization scope was found. Generate a Fly org token.',
					appCreated: false,
					flyAppName: candidateAppName,
					mode
				};
			}

			const { app, created } = await ensureFlyApp(trimmedToken, candidateAppName, orgSlug);
			return {
				ok: true,
				status: 'ready',
				message: created ? `Fly app ${app.name} created.` : `Fly app ${app.name} is ready.`,
				appCreated: created,
				flyAppName: app.name,
				mode
			};
		} catch (error) {
			if (error instanceof FlyRequestError) {
				if (error.status === 400) {
					const details = parseErrorMessage(error.body);
					if (details.toLowerCase().includes('org_slug')) {
						return {
							ok: false,
							status: 'insufficient_scope',
							message:
								'Unable to determine Fly organization for this token. Generate an org token and reconnect Fly.',
							appCreated: false,
							flyAppName: candidateAppName,
							mode
						};
					}
				}

				if (error.status === 409) {
					if (canRetryName && attempt < maxAttempts - 1) {
						candidateAppName = generateFlyAppName();
						continue;
					}
					return {
						ok: false,
						status: 'name_conflict',
						message: `Fly app name ${candidateAppName} is unavailable. Use a different app name.`,
						appCreated: false,
						flyAppName: candidateAppName,
						mode
					};
				}

				if (error.status === 401) {
					return {
						ok: false,
						status: 'invalid_token',
						message: 'Invalid Fly token.',
						appCreated: false,
						flyAppName: candidateAppName,
						mode
					};
				}

				if (error.status === 403) {
					const details = parseErrorMessage(error.body);
					return {
						ok: false,
						status: 'insufficient_scope',
						message:
							mode === 'deploy'
								? details ||
								  'Deploy token cannot access this app. Use the matching app name or switch setup mode.'
								: details ||
								  'Token cannot create or access Fly apps. Use an org-scoped token or pre-create the app.',
						appCreated: false,
						flyAppName: candidateAppName,
						mode
					};
				}

				return {
					ok: false,
					status: 'error',
					message: parseErrorMessage(error.body),
					appCreated: false,
					flyAppName: candidateAppName,
					mode
				};
			}

			return {
				ok: false,
				status: 'error',
				message: 'Unable to validate Fly credentials.',
				appCreated: false,
				flyAppName: candidateAppName,
				mode
			};
		}
	}

	return {
		ok: false,
		status: 'error',
		message: 'Unable to validate Fly credentials.',
		appCreated: false,
		flyAppName: candidateAppName,
		mode
	};
};
