import type { LayoutServerLoad } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const load: LayoutServerLoad = async (event) => {
	// Try Auth.js session first
	const authSession = await event.locals.auth?.() || null;

	if (authSession?.user) {
		return {
			session: authSession,
			user: {
				id: authSession.user.id,
				email: authSession.user.email,
				name: authSession.user.name,
				image: authSession.user.image
			}
		};
	}

	// Fall back to manual session management
	const sessionToken = event.cookies.get('session-token');

	if (!sessionToken) {
		return {
			session: null,
			user: null
		};
	}

	try {
		const session = await prisma.session.findUnique({
			where: {
				sessionToken: sessionToken
			},
			include: {
				user: true
			}
		});

		if (!session || session.expires < new Date()) {
			// Session expired or not found
			event.cookies.delete('session-token', { path: '/' });
			return {
				session: null,
				user: null
			};
		}

		return {
			session: null, // Manual session
			user: {
				id: session.user.id,
				email: session.user.email!,
				name: session.user.name,
				image: session.user.image
			}
		};
	} catch (err) {
		console.error('Session check error:', err);
		return {
			session: null,
			user: null
		};
	}
};