import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

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

const parseDomain = (doc?: string) => {
	if (!doc) return 'github.com';
	try {
		return new URL(doc).hostname.replace('www.', '');
	} catch {
		return 'github.com';
	}
};

const readOpenCodeRegistry = async (): Promise<{
	providers: ProviderCatalogEntry[];
	models: ModelCatalogEntry[];
}> => {
	const modelsPath = join(homedir(), '.cache', 'opencode', 'models.json');
	const raw = await readFile(modelsPath, 'utf8');
	const data = JSON.parse(raw) as Record<
		string,
		{
			id: string;
			name: string;
			doc?: string;
			env?: string[];
			models?: Record<
				string,
				{
					id: string;
					name?: string;
					reasoning?: boolean;
					tool_call?: boolean;
					release_date?: string;
					limit?: { context?: number };
				}
			>;
		}
	>;
	const entries = Object.values(data)
		.filter((provider) => provider?.id)
		.map((provider) => ({
			id: provider.id,
			name: provider.name ?? provider.id,
			doc: provider.doc,
			env: provider.env ?? [],
			domain: parseDomain(provider.doc)
		}));
	const models = Object.values(data).flatMap((provider) => {
		const providerId = provider.id;
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

	const withAmp = entries.some((entry) => entry.id === 'amp')
		? entries
		: [
			...entries,
			{ id: 'amp', name: 'Amp', doc: 'https://ampcode.com', env: ['AMP_API_KEY'], domain: 'ampcode.com' }
		  ];

	return {
		providers: withAmp.sort((a, b) => a.name.localeCompare(b.name)),
		models
	};
};

const pickTopModels = (models: ModelCatalogEntry[]): ModelCatalogEntry[] => {
	const selected = new Map<string, ModelCatalogEntry>();
	for (const target of BENCHMARK_TOP_MODEL_IDS) {
		const exact = models.find((model) => model.id.toLowerCase() === target.toLowerCase());
		const partial = models.find((model) => model.id.toLowerCase().startsWith(target.toLowerCase()));
		const match = exact ?? partial;
		if (match) {
			selected.set(match.id.toLowerCase(), match);
		}
		if (selected.size >= 5) break;
	}

	if (selected.size < 5) {
		const rankedFallback = [...models]
			.filter((model) => !selected.has(model.id.toLowerCase()))
			.sort((a, b) => {
				const scoreA = (a.reasoning ? 2 : 0) + (a.toolCall ? 1 : 0) + Math.min(a.contextWindow, 1_000_000) / 100_000;
				const scoreB = (b.reasoning ? 2 : 0) + (b.toolCall ? 1 : 0) + Math.min(b.contextWindow, 1_000_000) / 100_000;
				if (scoreB !== scoreA) return scoreB - scoreA;
				return b.id.localeCompare(a.id);
			});
		for (const model of rankedFallback) {
			selected.set(model.id.toLowerCase(), model);
			if (selected.size >= 5) break;
		}
	}

	return [...selected.values()].slice(0, 5);
};

export const getProviderCatalog = async () => {
	const registry = await readOpenCodeRegistry().catch(() => ({ providers: FALLBACK_PROVIDERS, models: [] }));
	const allProviders = registry.providers;
	const providerMap = new Map(allProviders.map((provider) => [provider.id, provider]));
	const featured = FEATURED_PROVIDER_IDS.map((id) => providerMap.get(id) ?? FALLBACK_PROVIDERS.find((entry) => entry.id === id))
		.filter((entry): entry is ProviderCatalogEntry => Boolean(entry));

	return {
		featured,
		all: allProviders,
		featuredIds: [...FEATURED_PROVIDER_IDS],
		topModels: pickTopModels(registry.models)
	};
};
