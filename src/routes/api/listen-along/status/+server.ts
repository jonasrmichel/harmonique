import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

		// Get active listen-along session
		const listenAlong = await prisma.listenAlong.findFirst({
			where: {
				listenerId: session.user.id,
				isActive: true
			},
			include: {
				targetUser: {
					include: {
						nowPlaying: true
					}
				}
			}
		});

		if (!listenAlong) {
			return json({
				active: false
			});
		}

		return json({
			active: true,
			listenAlong: {
				id: listenAlong.id,
				createdAt: listenAlong.createdAt,
				targetUser: {
					id: listenAlong.targetUser.id,
					name: listenAlong.targetUser.name,
					image: listenAlong.targetUser.image,
					nowPlaying: listenAlong.targetUser.nowPlaying
				}
			}
		});
	} catch (err: any) {
		console.error('Error getting listen-along status:', err);
		return json({ error: 'Failed to get status', details: err.message }, { status: 500 });
	}
};