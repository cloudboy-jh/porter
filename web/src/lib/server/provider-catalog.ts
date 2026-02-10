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

const parseDomain = (doc?: string) => {
	if (!doc) return 'github.com';
	try {
		return new URL(doc).hostname.replace('www.', '');
	} catch {
		return 'github.com';
	}
};

const readOpenCodeProviders = async (): Promise<ProviderCatalogEntry[]> => {
	const modelsPath = join(homedir(), '.cache', 'opencode', 'models.json');
	const raw = await readFile(modelsPath, 'utf8');
	const data = JSON.parse(raw) as Record<string, { id: string; name: string; doc?: string; env?: string[] }>;
	const entries = Object.values(data)
		.filter((provider) => provider?.id)
		.map((provider) => ({
			id: provider.id,
			name: provider.name ?? provider.id,
			doc: provider.doc,
			env: provider.env ?? [],
			domain: parseDomain(provider.doc)
		}));

	const withAmp = entries.some((entry) => entry.id === 'amp')
		? entries
		: [
			...entries,
			{ id: 'amp', name: 'Amp', doc: 'https://ampcode.com', env: ['AMP_API_KEY'], domain: 'ampcode.com' }
		  ];

	return withAmp.sort((a, b) => a.name.localeCompare(b.name));
};

export const getProviderCatalog = async () => {
	const allProviders = await readOpenCodeProviders().catch(() => FALLBACK_PROVIDERS);
	const providerMap = new Map(allProviders.map((provider) => [provider.id, provider]));
	const featured = FEATURED_PROVIDER_IDS.map((id) => providerMap.get(id) ?? FALLBACK_PROVIDERS.find((entry) => entry.id === id))
		.filter((entry): entry is ProviderCatalogEntry => Boolean(entry));

	return {
		featured,
		all: allProviders,
		featuredIds: [...FEATURED_PROVIDER_IDS]
	};
};
