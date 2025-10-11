import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Store active SSE connections
export const connections = new Map<string, Set<Response>>();

export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { recipientId, emoji, context } = body;

		if (!recipientId || !emoji) {
			return json({ error: 'Recipient and emoji are required' }, { status: 400 });
		}

		// Validate emoji (basic check - allow common emojis)
		const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component})+$/u;
		if (!emojiRegex.test(emoji) || emoji.length > 10) {
			return json({ error: 'Invalid emoji' }, { status: 400 });
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

		// Check if recipient exists
		const recipient = await prisma.user.findUnique({
			where: { id: recipientId }
		});

		if (!recipient) {
			return json({ error: 'Recipient not found' }, { status: 404 });
		}

		// Don't allow sending emotes to yourself
		if (session.user.id === recipientId) {
			return json({ error: 'Cannot send emote to yourself' }, { status: 400 });
		}

		// Create emote with 30 second expiry
		const expiresAt = new Date(Date.now() + 30 * 1000);

		const emote = await prisma.emote.create({
			data: {
				senderId: session.user.id,
				recipientId,
				emoji,
				context: context || 'listening-now',
				expiresAt
			},
			include: {
				sender: {
					select: {
						id: true,
						name: true,
						image: true
					}
				}
			}
		});

		// Send real-time notification to recipient if they have an active SSE connection
		const recipientConnections = connections.get(recipientId);
		if (recipientConnections && recipientConnections.size > 0) {
			const data = JSON.stringify({
				type: 'emote',
				emote: {
					id: emote.id,
					emoji: emote.emoji,
					sender: emote.sender,
					createdAt: emote.createdAt
				}
			});

			// Send to all active connections for this user
			recipientConnections.forEach(connection => {
				try {
					// @ts-ignore - SSE response has write method
					connection.write(`data: ${data}\n\n`);
				} catch (err) {
					// Connection might be closed, remove it
					recipientConnections.delete(connection);
				}
			});

			// Mark as delivered
			await prisma.emote.update({
				where: { id: emote.id },
				data: { delivered: true }
			});
		}

		return json({
			success: true,
			emote: {
				id: emote.id,
				emoji: emote.emoji,
				recipientId: emote.recipientId,
				createdAt: emote.createdAt
			}
		});
	} catch (err: any) {
		console.error('Error sending emote:', err);
		return json({ error: 'Failed to send emote', details: err.message }, { status: 500 });
	}
};