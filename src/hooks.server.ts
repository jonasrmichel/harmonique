import { handle as authHandle } from './auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Skip Auth.js for our manual OAuth callback and signout
	if (event.url.pathname.startsWith('/auth/callback/spotify') ||
	    event.url.pathname.startsWith('/auth/signout')) {
		return resolve(event);
	}

	// Let Auth.js handle other auth routes
	return authHandle({ event, resolve });
};