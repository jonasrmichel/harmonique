import { redirect } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { PageServerLoad } from './$types';

const prisma = new PrismaClient();

export const load: PageServerLoad = async ({ cookies }) => {
	// Get the session token
	const sessionToken = cookies.get('session-token');

	// Delete session and associated account from database if it exists
	if (sessionToken) {
		try {
			// First get the session to find the user
			const session = await prisma.session.findUnique({
				where: { sessionToken },
				include: { user: true }
			});

			if (session) {
				// Delete the session
				await prisma.session.delete({
					where: { sessionToken }
				});

				// Also delete ALL sessions for this user to ensure complete logout
				await prisma.session.deleteMany({
					where: { userId: session.userId }
				});
			}
		} catch (e) {
			// Session might not exist, ignore
			console.error('Error during logout:', e);
		}
	}

	// Delete the session cookie by setting it to expire immediately
	cookies.set('session-token', '', {
		path: '/',
		expires: new Date(0),
		maxAge: 0
	});

	// Also delete without options in case cookie was set differently
	cookies.delete('session-token', { path: '/' });

	// Delete all other cookies that might exist
	const allCookies = cookies.getAll();
	for (const cookie of allCookies) {
		cookies.delete(cookie.name, { path: '/' });
		cookies.set(cookie.name, '', {
			path: '/',
			expires: new Date(0),
			maxAge: 0
		});
	}

	// Redirect to home with a 303 (See Other) status to avoid form resubmission
	throw redirect(303, '/');
};