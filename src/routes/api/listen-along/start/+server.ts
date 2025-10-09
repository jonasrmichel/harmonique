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
		const { targetUserId } = body;

		if (!targetUserId) {
			return json({ error: 'Target user ID is required' }, { status: 400 });
		}

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

		// Check if target user exists
		const targetUser = await prisma.user.findUnique({
			where: { id: targetUserId },
			include: {
				nowPlaying: true
			}
		});

		if (!targetUser) {
			return json({ error: 'Target user not found' }, { status: 404 });
		}

		// Deactivate any existing listen-along sessions for this listener
		await prisma.listenAlong.updateMany({
			where: {
				listenerId: session.user.id,
				isActive: true
			},
			data: {
				isActive: false
			}
		});

		// Create or update listen-along session
		const listenAlong = await prisma.listenAlong.upsert({
			where: {
				listenerId_targetUserId: {
					listenerId: session.user.id,
					targetUserId: targetUserId
				}
			},
			update: {
				isActive: true,
				updatedAt: new Date()
			},
			create: {
				listenerId: session.user.id,
				targetUserId: targetUserId,
				isActive: true
			}
		});

		// If target user is currently playing, immediately sync
		let syncResult = null;
		if (targetUser.nowPlaying && targetUser.nowPlaying.isPlaying) {
			// Get the listener's Spotify account
			const listenerAccount = await prisma.account.findFirst({
				where: {
					userId: session.user.id,
					provider: 'spotify'
				}
			});

			if (listenerAccount?.access_token) {
				// Sync playback immediately
				const syncResponse = await fetch(`${request.url.origin}/api/listen-along/sync`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Cookie': request.headers.get('cookie') || ''
					}
				});

				if (syncResponse.ok) {
					syncResult = await syncResponse.json();
				}
			}
		}

		return json({
			success: true,
			listenAlong: {
				id: listenAlong.id,
				targetUser: {
					id: targetUser.id,
					name: targetUser.name,
					image: targetUser.image
				},
				nowPlaying: targetUser.nowPlaying,
				syncResult
			}
		});
	} catch (err: any) {
		console.error('Error starting listen along:', err);
		return json({ error: 'Failed to start listen along', details: err.message }, { status: 500 });
	}
};