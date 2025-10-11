import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { connections } from '../send/+server';

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ cookies, request }) => {
	const sessionToken = cookies.get('session-token');

	if (!sessionToken) {
		return new Response('Unauthorized', { status: 401 });
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
			return new Response('Invalid session', { status: 401 });
		}

		const userId = session.user.id;

		// Create SSE stream
		const stream = new ReadableStream({
			start(controller) {
				// Send initial connection message
				controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

				// Store this connection
				if (!connections.has(userId)) {
					connections.set(userId, new Set());
				}

				// Create a mock response object that the send endpoint can write to
				const mockResponse = {
					write: (data: string) => {
						try {
							controller.enqueue(data);
						} catch (err) {
							// Stream might be closed
							console.error('Failed to write to stream:', err);
						}
					}
				};

				connections.get(userId)!.add(mockResponse as any);

				// Send any pending emotes
				prisma.emote.findMany({
					where: {
						recipientId: userId,
						delivered: false,
						expiresAt: {
							gt: new Date()
						}
					},
					include: {
						sender: {
							select: {
								id: true,
								name: true,
								image: true
							}
						}
					},
					orderBy: {
						createdAt: 'desc'
					}
				}).then(pendingEmotes => {
					pendingEmotes.forEach(emote => {
						const data = JSON.stringify({
							type: 'emote',
							emote: {
								id: emote.id,
								emoji: emote.emoji,
								sender: emote.sender,
								createdAt: emote.createdAt
							}
						});
						controller.enqueue(`data: ${data}\n\n`);
					});

					// Mark them as delivered
					if (pendingEmotes.length > 0) {
						prisma.emote.updateMany({
							where: {
								id: {
									in: pendingEmotes.map(e => e.id)
								}
							},
							data: {
								delivered: true
							}
						}).catch(console.error);
					}
				});

				// Send heartbeat every 30 seconds to keep connection alive
				const heartbeat = setInterval(() => {
					try {
						controller.enqueue(': heartbeat\n\n');
					} catch (err) {
						// Stream closed, clean up
						clearInterval(heartbeat);
						const userConnections = connections.get(userId);
						if (userConnections) {
							userConnections.delete(mockResponse as any);
							if (userConnections.size === 0) {
								connections.delete(userId);
							}
						}
					}
				}, 30000);

				// Clean up expired emotes periodically
				const cleanupInterval = setInterval(async () => {
					try {
						await prisma.emote.deleteMany({
							where: {
								expiresAt: {
									lt: new Date()
								}
							}
						});
					} catch (err) {
						console.error('Failed to clean up expired emotes:', err);
					}
				}, 60000); // Every minute

				// Cleanup on close
				request.signal.addEventListener('abort', () => {
					clearInterval(heartbeat);
					clearInterval(cleanupInterval);
					const userConnections = connections.get(userId);
					if (userConnections) {
						userConnections.delete(mockResponse as any);
						if (userConnections.size === 0) {
							connections.delete(userId);
						}
					}
				});
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'X-Accel-Buffering': 'no' // Disable Nginx buffering
			}
		});
	} catch (err: any) {
		console.error('Error creating emote stream:', err);
		return new Response('Internal server error', { status: 500 });
	}
};