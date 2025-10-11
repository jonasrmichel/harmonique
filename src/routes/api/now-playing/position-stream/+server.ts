import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { positionConnections } from '$lib/position-connections';

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
			async start(controller) {
				// Send initial connection message
				controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

				// Get all current positions and send them
				const currentPositions = await prisma.nowPlaying.findMany({
					where: {
						positionX: { not: null },
						positionY: { not: null },
						// Only get recently updated positions (within last hour)
						updatedAt: {
							gte: new Date(Date.now() - 60 * 60 * 1000)
						}
					},
					include: {
						user: {
							select: {
								id: true,
								name: true,
								image: true
							}
						}
					}
				});

				// Send all current positions
				for (const pos of currentPositions) {
					if (pos.positionX !== null && pos.positionY !== null) {
						const data = JSON.stringify({
							type: 'position',
							userId: pos.user.id,
							userName: pos.user.name || 'User',
							x: pos.positionX,
							y: pos.positionY,
							timestamp: Date.now()
						});
						controller.enqueue(`data: ${data}\n\n`);
					}
				}

				// Store this connection
				if (!positionConnections.has(userId)) {
					positionConnections.set(userId, new Set());
				}

				// Create a mock response object that the position endpoint can write to
				const mockResponse = {
					write: (data: string) => {
						try {
							controller.enqueue(data);
						} catch (err) {
							// Stream might be closed
							console.error('Failed to write to position stream:', err);
						}
					}
				};

				positionConnections.get(userId)!.add(mockResponse as any);

				// Send heartbeat every 30 seconds to keep connection alive
				const heartbeat = setInterval(() => {
					try {
						controller.enqueue(': heartbeat\n\n');
					} catch (err) {
						// Stream closed, clean up
						clearInterval(heartbeat);
						const userConnections = positionConnections.get(userId);
						if (userConnections) {
							userConnections.delete(mockResponse as any);
							if (userConnections.size === 0) {
								positionConnections.delete(userId);
							}
						}
					}
				}, 30000);

				// Cleanup on close
				request.signal.addEventListener('abort', () => {
					clearInterval(heartbeat);
					const userConnections = positionConnections.get(userId);
					if (userConnections) {
						userConnections.delete(mockResponse as any);
						if (userConnections.size === 0) {
							positionConnections.delete(userId);
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
		console.error('Error creating position stream:', err);
		return new Response('Internal server error', { status: 500 });
	}
};