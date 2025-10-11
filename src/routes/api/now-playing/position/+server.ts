import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { broadcastPositionUpdate } from '$lib/position-connections';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { x, y } = body;

		if (typeof x !== 'number' || typeof y !== 'number') {
			return json({ error: 'Invalid position coordinates' }, { status: 400 });
		}

		// Get session with user
		const session = await prisma.session.findUnique({
			where: { sessionToken },
			include: { user: true }
		});

		if (!session?.user) {
			return json({ error: 'Invalid session' }, { status: 401 });
		}

		// Update or create now playing record with position
		const nowPlaying = await prisma.nowPlaying.upsert({
			where: { userId: session.user.id },
			update: {
				positionX: x,
				positionY: y
			},
			create: {
				userId: session.user.id,
				trackName: 'Unknown', // These are required fields, will be updated when playing
				artistNames: 'Unknown',
				duration: 0,
				progress: 0,
				isPlaying: false,
				positionX: x,
				positionY: y
			}
		});

		// Broadcast position update to all connected clients
		broadcastPositionUpdate(session.user.id, session.user.name || 'User', x, y);

		return json({
			success: true,
			position: { x: nowPlaying.positionX, y: nowPlaying.positionY }
		});
	} catch (err: any) {
		console.error('Error updating position:', err);
		return json({ error: 'Failed to update position' }, { status: 500 });
	}
};