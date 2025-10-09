import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const POST: RequestHandler = async ({ cookies }) => {
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

		// Deactivate all active listen-along sessions for this user
		const result = await prisma.listenAlong.updateMany({
			where: {
				listenerId: session.user.id,
				isActive: true
			},
			data: {
				isActive: false,
				updatedAt: new Date()
			}
		});

		return json({
			success: true,
			deactivatedCount: result.count
		});
	} catch (err: any) {
		console.error('Error stopping listen along:', err);
		return json({ error: 'Failed to stop listen along', details: err.message }, { status: 500 });
	}
};