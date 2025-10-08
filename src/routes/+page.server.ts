import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	// Force invalidation of all data
	depends('app:session');

	// Get parent data to ensure user state is fresh
	await parent();

	return {};
};