import { json } from '@sveltejs/kit';
import { scanAgentsNow } from '$lib/server/store';

export const POST = async ({ locals }: { locals: App.Locals }) => {
	if (!locals.session) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	const agents = await scanAgentsNow();
	return json(agents);
};
