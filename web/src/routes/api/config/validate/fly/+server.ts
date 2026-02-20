import { json } from '@sveltejs/kit';

import { getConfig } from '$lib/server/store';
import { validateFlyCredentialsWithMode, type FlySetupMode } from '$lib/server/fly';

const normalizeSetupMode = (value: string | null): FlySetupMode =>
	value === 'deploy' ? 'deploy' : 'org';

export const GET = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const setupMode = normalizeSetupMode(url.searchParams.get('mode'));
	const config = await getConfig(locals.session.token, {
		githubUserId: locals.session.user.id,
		githubLogin: locals.session.user.login
	});
	const validation = await validateFlyCredentialsWithMode(config.flyToken ?? '', config.flyAppName ?? '', {
		mode: setupMode
	});
	return json(validation, { status: validation.ok ? 200 : 400 });
};
