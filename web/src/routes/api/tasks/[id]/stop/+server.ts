import { json } from '@sveltejs/kit';

import { updateTaskStatus } from '$lib/server/store';

export const PUT = ({ params }: { params: { id: string } }) => {
	const updated = updateTaskStatus(params.id, 'failed', 'stopped by user');
	if (!updated) {
		return json({ error: 'task not found' }, { status: 404 });
	}
	return json(updated);
};
