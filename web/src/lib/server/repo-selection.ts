import type { PorterConfig } from './types';

type RepoLike = {
	id?: number;
	owner: string;
	name: string;
};

const repoKey = (owner: string, name: string) => `${owner}/${name}`.toLowerCase();

const getSelectionSets = (config: PorterConfig) => {
	if (!config.onboarding?.completed) {
		return null;
	}

	const selected = config.onboarding.selectedRepos ?? [];
	return {
		ids: new Set(selected.map((repo) => repo.id)),
		keys: new Set(selected.map((repo) => repoKey(repo.owner, repo.name)))
	};
};

const isRepoInSelection = (
	repo: RepoLike,
	selection: { ids: Set<number>; keys: Set<string> } | null
) => {
	if (!selection) {
		return true;
	}
	if (typeof repo.id === 'number' && selection.ids.has(repo.id)) {
		return true;
	}
	return selection.keys.has(repoKey(repo.owner, repo.name));
};

export const filterReposBySelection = <T extends RepoLike>(
	config: PorterConfig,
	repositories: T[]
) => {
	const selection = getSelectionSets(config);
	if (!selection) {
		return repositories;
	}
	return repositories.filter((repo) => isRepoInSelection(repo, selection));
};

export const isRepoSelectedByConfig = (
	config: PorterConfig,
	repo: RepoLike
) => {
	const selection = getSelectionSets(config);
	return isRepoInSelection(repo, selection);
};
