import { env as privateEnv } from '$env/dynamic/private';

export type ProviderCatalogEntry = {
	id: string;
	name: string;
	doc?: string;
	env: string[];
	domain: string;
};

export type ModelCatalogEntry = {
	id: string;
	name: string;
	providerId: string;
	providerName: string;
	domain: string;
	reasoning: boolean;
	toolCall: boolean;
	contextWindow: number;
	releaseDate?: string;
};

type ProviderModelSamples = Record<string, ModelCatalogEntry[]>;
type RegistrySource = 'custom_url' | 'openrouter' | 'fallback';

const FEATURED_PROVIDER_IDS = [
	'anthropic',
	'openai',
	'google',
	'openrouter',
	'amp',
	'xai',
	'groq',
	'deepseek',
	'zai',
	'moonshotai'
] as const;

const PROVIDER_LABELS: Record<string, string> = {
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	google: 'Google',
	openrouter: 'OpenRouter',
	xai: 'xAI',
	'x-ai': 'xAI',
	groq: 'Groq',
	deepseek: 'DeepSeek',
	moonshotai: 'Moonshot AI',
	zai: 'Z.AI',
	amp: 'Amp'
};

const PROVIDER_DOMAINS: Record<string, string> = {
	openai: 'openai.com',
	anthropic: 'anthropic.com',
	google: 'google.com',
	openrouter: 'openrouter.ai',
	xai: 'x.ai',
	'x-ai': 'x.ai',
	groq: 'groq.com',
	deepseek: 'deepseek.com',
	moonshotai: 'moonshot.ai',
	zai: 'z.ai',
	amp: 'ampcode.com'
};

const FALLBACK_PROVIDERS: ProviderCatalogEntry[] = [
	{ id: 'anthropic', name: 'Anthropic', env: ['ANTHROPIC_API_KEY'], doc: 'https://anthropic.com', domain: 'anthropic.com' },
	{ id: 'openai', name: 'OpenAI', env: ['OPENAI_API_KEY'], doc: 'https://openai.com', domain: 'openai.com' },
	{ id: 'google', name: 'Google', env: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY'], doc: 'https://ai.google.dev', domain: 'google.com' },
	{ id: 'openrouter', name: 'OpenRouter', env: ['OPENROUTER_API_KEY'], doc: 'https://openrouter.ai', domain: 'openrouter.ai' },
	{ id: 'amp', name: 'Amp', env: ['AMP_API_KEY'], doc: 'https://ampcode.com', domain: 'ampcode.com' },
	{ id: 'xai', name: 'xAI', env: ['XAI_API_KEY'], doc: 'https://x.ai', domain: 'x.ai' },
	{ id: 'groq', name: 'Groq', env: ['GROQ_API_KEY'], doc: 'https://groq.com', domain: 'groq.com' },
	{ id: 'deepseek', name: 'DeepSeek', env: ['DEEPSEEK_API_KEY'], doc: 'https://deepseek.com', domain: 'deepseek.com' },
	{ id: 'zai', name: 'Z.AI', env: ['ZHIPU_API_KEY'], doc: 'https://z.ai', domain: 'z.ai' },
	{ id: 'moonshotai', name: 'Moonshot AI', env: ['MOONSHOT_API_KEY'], doc: 'https://moonshot.ai', domain: 'moonshot.ai' }
];

const BENCHMARK_TOP_MODEL_IDS = [
	'openai/gpt-5',
	'anthropic/claude-opus-4.1',
	'anthropic/claude-sonnet-4.6',
	'google/gemini-2.5-pro',
	'x-ai/grok-4',
	'moonshotai/Kimi-K2.5'
] as const;

const FALLBACK_MODELS: ModelCatalogEntry[] = [
	{ id: 'openai/gpt-5', name: 'GPT-5', providerId: 'openai', providerName: 'OpenAI', domain: 'openai.com', reasoning: true, toolCall: true, contextWindow: 200000 },
	{ id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1', providerId: 'anthropic', providerName: 'Anthropic', domain: 'anthropic.com', reasoning: true, toolCall: true, contextWindow: 200000 },
	{ id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', providerId: 'anthropic', providerName: 'Anthropic', domain: 'anthropic.com', reasoning: true, toolCall: true, contextWindow: 200000 },
	{ id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', providerId: 'google', providerName: 'Google', domain: 'google.com', reasoning: true, toolCall: true, contextWindow: 1000000 },
	{ id: 'x-ai/grok-4', name: 'Grok 4', providerId: 'xai', providerName: 'xAI', domain: 'x.ai', reasoning: true, toolCall: true, contextWindow: 256000 },
	{ id: 'moonshotai/Kimi-K2.5', name: 'Kimi K2.5', providerId: 'moonshotai', providerName: 'Moonshot AI', domain: 'moonshot.ai', reasoning: true, toolCall: true, contextWindow: 262144 },
	{ id: 'openai/gpt-4.1', name: 'GPT-4.1', providerId: 'openai', providerName: 'OpenAI', domain: 'openai.com', reasoning: true, toolCall: true, contextWindow: 128000 },
	{ id: 'openrouter/auto', name: 'OpenRouter Auto', providerId: 'openrouter', providerName: 'OpenRouter', domain: 'openrouter.ai', reasoning: true, toolCall: true, contextWindow: 128000 }
];

const parseDomain = (doc?: string) => {
	if (!doc) return 'github.com';
	try {
		return new URL(doc).hostname.replace('www.', '');
	} catch {
		return 'github.com';
	}
};

const withTimeout = async <T>(task: Promise<T>, ms: number): Promise<T> => {
	const timeout = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
	});
	return Promise.race([task, timeout]);
};

const normalizeProviderId = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, '');

const providerNameFor = (providerId: string) => {
	const key = providerId.toLowerCase();
	return PROVIDER_LABELS[key] ?? key.toUpperCase();
};

const providerDomainFor = (providerId: string) => {
	const key = providerId.toLowerCase();
	return PROVIDER_DOMAINS[key] ?? 'github.com';
};

const parseOpenCodePayload = (
	payload: Record<
		string,
		{
			id: string;
			name: string;
			doc?: string;
			env?: string[];
			models?: Record<
				string,
				{ id: string; name?: string; reasoning?: boolean; tool_call?: boolean; release_date?: string; limit?: { context?: number } }
			>;
		}
	>
) => {
	const providers = Object.values(payload)
		.filter((provider) => provider?.id)
		.map((provider) => ({
			id: normalizeProviderId(provider.id),
			name: provider.name ?? provider.id,
			doc: provider.doc,
			env: provider.env ?? [],
			domain: parseDomain(provider.doc)
		}));

	const models = Object.values(payload).flatMap((provider) => {
		const providerId = normalizeProviderId(provider.id);
		const providerName = provider.name ?? provider.id;
		const domain = parseDomain(provider.doc);
		return Object.values(provider.models ?? {}).map((model) => ({
			id: model.id,
			name: model.name ?? model.id,
			providerId,
			providerName,
			domain,
			reasoning: Boolean(model.reasoning),
			toolCall: Boolean(model.tool_call),
			contextWindow: model.limit?.context ?? 0,
			releaseDate: model.release_date
		}));
	});

	return { providers, models };
};

const readRemoteRegistryFromUrl = async (url: string) => {
	const response = await withTimeout(fetch(url, { headers: { accept: 'application/json' } }), 5000);
	if (!response.ok) {
		throw new Error(`registry request failed: ${response.status}`);
	}
	const payload = (await response.json()) as Record<string, unknown>;
	return parseOpenCodePayload(payload as Record<string, any>);
};

const readOpenRouterModelRegistry = async (): Promise<ModelCatalogEntry[]> => {
	const response = await withTimeout(fetch('https://openrouter.ai/api/v1/models', { headers: { accept: 'application/json' } }), 5000);
	if (!response.ok) {
		throw new Error(`openrouter request failed: ${response.status}`);
	}
	const payload = (await response.json()) as {
		data?: Array<{ id: string; name?: string; context_length?: number; created?: number }>;
	};
	return (payload.data ?? [])
		.filter((model) => Boolean(model.id))
		.map((model) => {
			const rawProvider = model.id.includes('/') ? model.id.split('/')[0] : 'openrouter';
			const providerId = normalizeProviderId(rawProvider);
			return {
				id: model.id,
				name: model.name ?? model.id,
				providerId,
				providerName: providerNameFor(providerId),
				domain: providerDomainFor(providerId),
				reasoning: true,
				toolCall: true,
				contextWindow: model.context_length ?? 0,
				releaseDate: model.created ? new Date(model.created * 1000).toISOString().slice(0, 10) : undefined
			};
		});
};

const pickTopModels = (models: ModelCatalogEntry[]): ModelCatalogEntry[] => {
	const selected = new Map<string, ModelCatalogEntry>();
	for (const target of BENCHMARK_TOP_MODEL_IDS) {
		const exact = models.find((model) => model.id.toLowerCase() === target.toLowerCase());
		const partial = models.find((model) => model.id.toLowerCase().startsWith(target.toLowerCase()));
		const match = exact ?? partial;
		if (match) selected.set(match.id.toLowerCase(), match);
		if (selected.size >= 5) break;
	}

	if (selected.size < 5) {
		const rankedFallback = [...models]
			.filter((model) => !selected.has(model.id.toLowerCase()))
			.sort((a, b) => {
				const scoreA = (a.reasoning ? 2 : 0) + (a.toolCall ? 1 : 0) + Math.min(a.contextWindow, 1_000_000) / 100_000;
				const scoreB = (b.reasoning ? 2 : 0) + (b.toolCall ? 1 : 0) + Math.min(b.contextWindow, 1_000_000) / 100_000;
				if (scoreB !== scoreA) return scoreB - scoreA;
				return a.id.localeCompare(b.id);
			});
		for (const model of rankedFallback) {
			selected.set(model.id.toLowerCase(), model);
			if (selected.size >= 5) break;
		}
	}

	return [...selected.values()].slice(0, 5);
};

const buildProviderModelSamples = (models: ModelCatalogEntry[], limit = 6): ProviderModelSamples => {
	const grouped = new Map<string, ModelCatalogEntry[]>();
	for (const model of models) {
		const key = model.providerId.toLowerCase();
		const current = grouped.get(key) ?? [];
		current.push(model);
		grouped.set(key, current);
	}

	const result: ProviderModelSamples = {};
	for (const [providerId, providerModels] of grouped.entries()) {
		result[providerId] = providerModels
			.sort((a, b) => {
				const scoreA = (a.reasoning ? 2 : 0) + (a.toolCall ? 1 : 0) + Math.min(a.contextWindow, 1_000_000) / 100_000;
				const scoreB = (b.reasoning ? 2 : 0) + (b.toolCall ? 1 : 0) + Math.min(b.contextWindow, 1_000_000) / 100_000;
				if (scoreB !== scoreA) return scoreB - scoreA;
				return a.name.localeCompare(b.name);
			})
			.slice(0, limit);
	}

	return result;
};

const mergeProviders = (providers: ProviderCatalogEntry[]) => {
	const map = new Map<string, ProviderCatalogEntry>();
	for (const fallback of FALLBACK_PROVIDERS) {
		map.set(fallback.id.toLowerCase(), fallback);
	}
	for (const provider of providers) {
		const key = provider.id.toLowerCase();
		const existing = map.get(key);
		if (!existing) {
			map.set(key, provider);
			continue;
		}
		map.set(key, {
			...existing,
			...provider,
			env: provider.env.length > 0 ? provider.env : existing.env
		});
	}
	return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const resolveRegistry = async (): Promise<{
	providers: ProviderCatalogEntry[];
	models: ModelCatalogEntry[];
	source: RegistrySource;
}> => {
	const customRegistryUrl = privateEnv.PORTER_MODEL_REGISTRY_URL?.trim();
	if (customRegistryUrl) {
		try {
			const custom = await readRemoteRegistryFromUrl(customRegistryUrl);
			return { providers: mergeProviders(custom.providers), models: custom.models, source: 'custom_url' };
		} catch (error) {
			console.error('[provider-catalog] custom registry failed', {
				url: customRegistryUrl,
				error: error instanceof Error ? { name: error.name, message: error.message } : String(error)
			});
		}
	}

	try {
		const openRouterModels = await readOpenRouterModelRegistry();
		return { providers: FALLBACK_PROVIDERS, models: openRouterModels, source: 'openrouter' };
	} catch (error) {
		console.error('[provider-catalog] openrouter registry failed', {
			error: error instanceof Error ? { name: error.name, message: error.message } : String(error)
		});
	}

	return { providers: FALLBACK_PROVIDERS, models: FALLBACK_MODELS, source: 'fallback' };
};

export const getProviderCatalog = async () => {
	const registry = await resolveRegistry();
	const allProviders = registry.providers;
	const allModels = registry.models.length > 0 ? registry.models : FALLBACK_MODELS;
	const providerMap = new Map(allProviders.map((provider) => [provider.id.toLowerCase(), provider]));
	const featured = FEATURED_PROVIDER_IDS.map((id) => providerMap.get(id.toLowerCase()) ?? FALLBACK_PROVIDERS.find((entry) => entry.id === id))
		.filter((entry): entry is ProviderCatalogEntry => Boolean(entry));

	return {
		featured,
		all: allProviders,
		featuredIds: [...FEATURED_PROVIDER_IDS],
		topModels: pickTopModels(allModels),
		modelSamplesByProvider: buildProviderModelSamples(allModels),
		registrySource: registry.source
	};
};
