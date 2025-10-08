import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const body = await request.json();

		// Get session with user
		const session = await prisma.session.findUnique({
			where: { sessionToken },
			include: { user: true }
		});

		if (!session?.user) {
			return json({ error: 'Session not found' }, { status: 401 });
		}

		// If no track is playing, delete the now playing record
		if (!body.playing || !body.track) {
			await prisma.nowPlaying.deleteMany({
				where: { userId: session.user.id }
			});
			return json({ success: true, deleted: true });
		}

		// Upsert the now playing record
		const nowPlaying = await prisma.nowPlaying.upsert({
			where: { userId: session.user.id },
			update: {
				trackId: body.track.id,
				trackName: body.track.name,
				artistNames: body.track.artists.map((a: any) => a.name).join(', '),
				albumName: body.track.album?.name || null,
				albumImage: body.track.album?.image || null,
				duration: body.track.duration_ms || 0,
				progress: body.track.progress_ms || 0,
				isPlaying: body.is_playing || false,
				volume: body.volume || 50,
				contextType: body.context?.type || null,
				contextUri: body.context?.uri || null,
				contextName: body.context?.name || null
			},
			create: {
				userId: session.user.id,
				trackId: body.track.id,
				trackName: body.track.name,
				artistNames: body.track.artists.map((a: any) => a.name).join(', '),
				albumName: body.track.album?.name || null,
				albumImage: body.track.album?.image || null,
				duration: body.track.duration_ms || 0,
				progress: body.track.progress_ms || 0,
				isPlaying: body.is_playing || false,
				volume: body.volume || 50,
				contextType: body.context?.type || null,
				contextUri: body.context?.uri || null,
				contextName: body.context?.name || null
			}
		});

		return json({ success: true, nowPlaying });
	} catch (err: any) {
		console.error('Error updating now playing:', err);
		return json({ error: 'Failed to update now playing', details: err.message }, { status: 500 });
	}
};

// GET endpoint to fetch all users' currently playing
export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '20');

		// Get all active now playing records from the last 10 minutes
		const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

		const nowPlayingList = await prisma.nowPlaying.findMany({
			where: {
				updatedAt: {
					gte: tenMinutesAgo
				}
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
						spotifyId: true
					}
				}
			},
			orderBy: {
				updatedAt: 'desc'
			},
			take: limit
		});

		return json({ nowPlayingList });
	} catch (err: any) {
		console.error('Error fetching now playing list:', err);
		return json({ error: 'Failed to fetch now playing list', details: err.message }, { status: 500 });
	}
};