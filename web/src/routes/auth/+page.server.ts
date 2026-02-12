import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const getGitHubAppInstallUrl = () => {
	const explicitUrl = env.GITHUB_APP_INSTALL_URL?.trim();
	if (explicitUrl) {
		return explicitUrl;
	}

	const appSlug = env.GITHUB_APP_SLUG?.trim();
	if (!appSlug) {
		return null;
	}

	return `https://github.com/apps/${appSlug}/installations/new`;
};

export const load: PageServerLoad = async () => ({
	githubAppInstallUrl: getGitHubAppInstallUrl()
});
