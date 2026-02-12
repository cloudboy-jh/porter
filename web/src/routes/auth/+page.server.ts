import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const getGitHubAppInstallUrl = () => {
	const publicInstallUrl = (env as Record<string, string | undefined>).PUBLIC_GITHUB_APP_INSTALL_URL;
	const explicitUrl =
		env.GITHUB_APP_INSTALL_URL?.trim() ?? publicInstallUrl?.trim();
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
