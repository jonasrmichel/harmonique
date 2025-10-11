import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all users who are currently listening along with me
export const GET: RequestHandler = async ({ cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		// Get session with user
		const session = await prisma.session.findUnique({
			where: { sessionToken },
			include: {
				user: true
			}
		});

		if (!session?.user) {
			return json({ error: 'Invalid session' }, { status: 401 });
		}

		// Get all active listen-along sessions where current user is the target
		const listeners = await prisma.listenAlong.findMany({
			where: {
				targetUserId: session.user.id,
				isActive: true
			},
			include: {
				listener: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						spotifyId: true,
						nowPlaying: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		// Format the response
		const formattedListeners = listeners.map(session => ({
			id: session.id,
			startedAt: session.createdAt,
			lastSync: session.updatedAt,
			user: {
				id: session.listener.id,
				name: session.listener.name,
				email: session.listener.email,
				image: session.listener.image,
				spotifyId: session.listener.spotifyId,
				nowPlaying: session.listener.nowPlaying
			}
		}));

		// Also get current user's now playing for reference
		const currentUser = await prisma.user.findUnique({
			where: { id: session.user.id },
			include: {
				nowPlaying: true
			}
		});

		return json({
			listeners: formattedListeners,
			totalCount: formattedListeners.length,
			currentUserNowPlaying: currentUser?.nowPlaying
		});
	} catch (err: any) {
		console.error('Error fetching listeners:', err);
		return json({ error: 'Failed to fetch listeners', details: err.message }, { status: 500 });
	}
};