// Store active SSE connections for position updates
// This is shared between position and position-stream endpoints
export const positionConnections = new Map<string, Set<any>>();

// Broadcast position update to all connected clients
export function broadcastPositionUpdate(userId: string, userName: string, x: number, y: number) {
	const data = JSON.stringify({
		type: 'position',
		userId,
		userName,
		x,
		y,
		timestamp: Date.now()
	});

	// Send to all connected clients
	for (const connections of positionConnections.values()) {
		connections.forEach(connection => {
			try {
				connection.write(`data: ${data}\n\n`);
			} catch (err) {
				// Connection might be closed, remove it
				connections.delete(connection);
			}
		});
	}
}