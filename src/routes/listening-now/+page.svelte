<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationId: number;
	let listeners: any[] = [];
	let currentTrack: any = null;
	let interval: NodeJS.Timeout;
	let currentUserId: string | null = null;

	// Store flame particle positions for each user
	let userFlames: Map<string, {
		x: number;
		y: number;
		targetX: number;
		targetY: number;
		velocityX: number;
		velocityY: number;
		particles: any[];
		userId: string;
		userName: string;
		spotifyId?: string;
		isCurrentUser?: boolean;
		isMoving?: boolean;
		moveStartTime?: number;
	}> = new Map();

	// User's custom position state
	let userCustomPosition: { x: number; y: number } | null = null;
	let isDragging = false;
	let dragStartPos = { x: 0, y: 0 };
	let dragOffset = { x: 0, y: 0 };

	// Long press detection
	let longPressTimer: NodeJS.Timeout | null = null;
	let longPressStartPos = { x: 0, y: 0 };
	let potentialMenuTarget: any = null;
	let justOpenedMenuViaLongPress = false;
	const LONG_PRESS_DURATION = 500; // 500ms for long press
	const LONG_PRESS_MOVEMENT_THRESHOLD = 5; // pixels allowed to move during long press

	// Track clickable areas for each user
	let clickableAreas: Array<{
		x: number;
		y: number;
		radius: number;
		userId: string;
		userName: string;
		spotifyId?: string;
		isCurrentUser?: boolean;
	}> = [];

	// Track hovered user
	let hoveredUserId: string | null = null;

	// Menu state
	let showMenu = false;
	let menuPosition = { x: 0, y: 0 };
	let selectedUser: any = null;
	let isListeningAlong = false;
	let currentListenAlongTarget: string | null = null;
	let syncInterval: NodeJS.Timeout;

	// Emote state
	let showEmotePicker = false;
	let emotePickerPosition = { x: 0, y: 0 };
	let emoteEventSource: EventSource | null = null;
	let receivedEmotes: Array<{
		id: string;
		emoji: string;
		sender: any;
		x: number;
		y: number;
		timestamp: number;
	}> = [];

	// Position sync state
	let positionEventSource: EventSource | null = null;
	let lastPositionUpdate = 0;
	const POSITION_UPDATE_THROTTLE = 100; // Throttle position updates to every 100ms

	// Popular emotes for quick selection
	const popularEmotes = ['❤️', '🔥', '🎵', '🎸', '🎤', '🎧', '👏', '💃', '🕺', '✨', '🌟', '💫', '🚀', '😎', '🤘', '🙌'];

	// Load saved position from localStorage
	function loadUserPosition() {
		const saved = localStorage.getItem('harmonique-flame-position');
		if (saved) {
			try {
				userCustomPosition = JSON.parse(saved);
			} catch (e) {
				console.error('Failed to load saved position');
			}
		}
	}

	// Save position to localStorage and send to server
	async function saveUserPosition(x: number, y: number) {
		userCustomPosition = { x, y };
		localStorage.setItem('harmonique-flame-position', JSON.stringify({ x, y }));

		// Throttle server updates
		const now = Date.now();
		if (now - lastPositionUpdate < POSITION_UPDATE_THROTTLE) {
			return;
		}
		lastPositionUpdate = now;

		// Send position update to server
		try {
			await fetch('/api/now-playing/position', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ x, y })
			});
		} catch (err) {
			console.error('Failed to update position on server:', err);
		}
	}

	// Move user's flame with keyboard
	function handleKeyDown(e: KeyboardEvent) {
		if (!canvas) return;

		console.log('Keyboard event:', e.key, 'CurrentUserId:', currentUserId, 'UserPosition:', userCustomPosition);

		const moveSpeed = e.shiftKey ? 50 : 15; // Hold shift for faster movement (increased from 20/5)
		let newX = userCustomPosition?.x || canvas.width / 2;
		let newY = userCustomPosition?.y || canvas.height / 2;

		switch(e.key) {
			case 'ArrowUp':
			case 'w':
			case 'W':
				newY -= moveSpeed;
				e.preventDefault();
				break;
			case 'ArrowDown':
			case 's':
			case 'S':
				newY += moveSpeed;
				e.preventDefault();
				break;
			case 'ArrowLeft':
			case 'a':
			case 'A':
				newX -= moveSpeed;
				e.preventDefault();
				break;
			case 'ArrowRight':
			case 'd':
			case 'D':
				newX += moveSpeed;
				e.preventDefault();
				break;
			case 'Home':
				// Reset to center
				newX = canvas.width / 2;
				newY = canvas.height / 2;
				e.preventDefault();
				break;
			case 'e':
			case 'E':
				// Open emoji picker at current user position
				if (currentUserId && canvas) {
					const currentUserFlame = userFlames.get(currentUserId);
					console.log('E pressed - Current user flame:', currentUserFlame);
					if (currentUserFlame) {
						const rect = canvas.getBoundingClientRect();
						// Show emoji picker near the current user's position
						emotePickerPosition = {
							x: currentUserFlame.x + rect.left,
							y: Math.max(100, currentUserFlame.y + rect.top - 150) // Keep on screen
						};
						selectedUser = null; // No specific target, broadcasting to all
						showEmotePicker = true;
						showMenu = false;
						console.log('Showing emoji picker at:', emotePickerPosition);
					}
				}
				e.preventDefault();
				return; // Don't move position when opening emoji picker
			default:
				return;
		}

		// Keep within canvas bounds
		newX = Math.max(50, Math.min(canvas.width - 50, newX));
		newY = Math.max(50, Math.min(canvas.height - 50, newY));

		saveUserPosition(newX, newY);
	}

	// Generate deterministic colors from track ID
	function generateVisualizationFromTrackId(trackId: string) {
		if (!trackId) return { colors: ['#1DB954', '#191414'], pattern: 'wave' };

		// Create a simple hash from the track ID
		let hash = 0;
		for (let i = 0; i < trackId.length; i++) {
			hash = ((hash << 5) - hash) + trackId.charCodeAt(i);
			hash = hash & hash; // Convert to 32bit integer
		}

		// Generate colors based on hash
		const hue1 = Math.abs(hash % 360);
		const hue2 = (hue1 + 120) % 360;
		const hue3 = (hue1 + 240) % 360;

		const colors = [
			`hsl(${hue1}, 70%, 50%)`,
			`hsl(${hue2}, 70%, 50%)`,
			`hsl(${hue3}, 70%, 50%)`
		];

		// Determine pattern based on hash
		const patterns = ['wave', 'pulse', 'spiral', 'particles'];
		const pattern = patterns[Math.abs(hash) % patterns.length];

		return { colors, pattern, seed: Math.abs(hash) };
	}

	// Fetch current playing track and listeners
	async function fetchListeningData() {
		try {
			// Get current user's playing track and ID
			const nowPlayingResponse = await fetch('/api/now-playing');
			if (nowPlayingResponse.ok) {
				const nowPlaying = await nowPlayingResponse.json();
				if (nowPlaying?.playing && nowPlaying?.track) {
					currentTrack = nowPlaying.track;
				}
				// Try to get user ID from the response
				if (nowPlaying?.user?.id) {
					currentUserId = nowPlaying.user.id;
					console.log('Current user ID set from now-playing:', currentUserId);
				}
			}

			// Get all listeners
			const listenersResponse = await fetch('/api/now-playing/update?limit=50');
			if (listenersResponse.ok) {
				const data = await listenersResponse.json();
				listeners = data.nowPlayingList || [];
				// Find current user in listeners to get their ID if not already set
				if (!currentUserId && data.currentUserId) {
					currentUserId = data.currentUserId;
					console.log('Current user ID set from listeners:', currentUserId);
				}
			}

			// Check listen-along status
			const statusResponse = await fetch('/api/listen-along/status');
			if (statusResponse.ok) {
				const status = await statusResponse.json();
				if (status.active) {
					isListeningAlong = true;
					currentListenAlongTarget = status.listenAlong.targetUser.id;
				} else {
					isListeningAlong = false;
					currentListenAlongTarget = null;
				}
			}
		} catch (error) {
			console.error('Failed to fetch listening data:', error);
		}
	}

	// Start listening along with a user
	async function startListenAlong(userId: string) {
		try {
			const response = await fetch('/api/listen-along/start', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ targetUserId: userId })
			});

			if (response.ok) {
				const result = await response.json();
				isListeningAlong = true;
				currentListenAlongTarget = userId;
				showMenu = false;

				// Show success message
				alert(`Now listening along with ${selectedUser?.userName || 'user'}! Your Spotify will sync with their playback.`);

				// Start auto-sync interval
				if (syncInterval) clearInterval(syncInterval);
				syncInterval = setInterval(syncPlayback, 5000); // Sync every 5 seconds

				// Initial sync
				await syncPlayback();
			} else {
				const error = await response.json();
				alert(`Failed to start listening along: ${error.error}`);
			}
		} catch (error) {
			console.error('Failed to start listen along:', error);
			alert('Failed to start listening along');
		}
	}

	// Stop listening along
	async function stopListenAlong() {
		try {
			const response = await fetch('/api/listen-along/stop', {
				method: 'POST'
			});

			if (response.ok) {
				isListeningAlong = false;
				currentListenAlongTarget = null;
				if (syncInterval) {
					clearInterval(syncInterval);
					syncInterval = null;
				}
			}
		} catch (error) {
			console.error('Failed to stop listen along:', error);
		}
	}

	// Sync playback with target user
	async function syncPlayback() {
		if (!isListeningAlong) return;

		try {
			const response = await fetch('/api/listen-along/sync', {
				method: 'POST'
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Sync error:', error);
			}
		} catch (error) {
			console.error('Failed to sync playback:', error);
		}
	}

	// Connect to emote stream
	function connectEmoteStream() {
		if (emoteEventSource) {
			emoteEventSource.close();
		}

		emoteEventSource = new EventSource('/api/emotes/stream');

		emoteEventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === 'emote') {
					// Try to position emote near the sender's current position
					let emoteX, emoteY;

					// Check if we have the sender's position
					const senderFlame = data.emote.sender?.id ? userFlames.get(data.emote.sender.id) : null;

					if (senderFlame) {
						// Position near the sender's flame
						emoteX = senderFlame.x + (Math.random() - 0.5) * 60;
						emoteY = senderFlame.y - 40;
					} else {
						// Fallback to random position if sender position not found
						const centerX = canvas.width / 2;
						const centerY = canvas.height / 2;
						const angle = Math.random() * Math.PI * 2;
						const radius = Math.min(canvas.width, canvas.height) * 0.3;
						emoteX = centerX + Math.cos(angle) * radius;
						emoteY = centerY + Math.sin(angle) * radius;
					}

					receivedEmotes.push({
						id: data.emote.id,
						emoji: data.emote.emoji,
						sender: data.emote.sender,
						x: emoteX,
						y: emoteY,
						timestamp: Date.now()
					});

					// Remove emote after 5 seconds
					setTimeout(() => {
						receivedEmotes = receivedEmotes.filter(e => e.id !== data.emote.id);
					}, 5000);
				}
			} catch (err) {
				console.error('Failed to parse emote data:', err);
			}
		};

		emoteEventSource.onerror = (err) => {
			console.error('Emote stream error:', err);
			// Reconnect after 5 seconds
			setTimeout(connectEmoteStream, 5000);
		};
	}

	// Connect to position stream for real-time updates
	function connectPositionStream() {
		if (positionEventSource) {
			positionEventSource.close();
		}

		positionEventSource = new EventSource('/api/now-playing/position-stream');

		positionEventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === 'position' && data.userId !== currentUserId) {
					// Update other user's position with bounce animation
					const userFlame = userFlames.get(data.userId);
					if (userFlame) {
						// Set new target position and trigger bounce animation
						userFlame.targetX = data.x;
						userFlame.targetY = data.y;
						userFlame.isMoving = true;
						userFlame.moveStartTime = Date.now();

						// Calculate initial velocity for bounce effect
						const dx = data.x - userFlame.x;
						const dy = data.y - userFlame.y;
						const distance = Math.sqrt(dx * dx + dy * dy);

						// Stronger initial velocity for bigger bounces
						if (distance > 5) {
							userFlame.velocityX = dx * 0.15;
							userFlame.velocityY = dy * 0.15;
						}
					}
				}
			} catch (err) {
				console.error('Failed to parse position data:', err);
			}
		};

		positionEventSource.onerror = (err) => {
			console.error('Position stream error:', err);
			// Reconnect after 5 seconds
			setTimeout(connectPositionStream, 5000);
		};
	}

	// Send an emote - either to a specific user or broadcast to all
	async function sendEmote(emoji: string) {
		console.log('Sending emote:', emoji, 'Selected user:', selectedUser, 'Current user ID:', currentUserId);

		// Close the picker immediately for better UX
		showEmotePicker = false;

		// Show the emote locally immediately (for both broadcast and targeted)
		// Try to find current user's flame in multiple ways
		let currentUserFlame = null;
		if (currentUserId) {
			currentUserFlame = userFlames.get(currentUserId);
		}

		// Fallback: find the current user's flame by checking isCurrentUser flag
		if (!currentUserFlame) {
			userFlames.forEach((flame, userId) => {
				if (flame.isCurrentUser) {
					currentUserFlame = flame;
					if (!currentUserId) currentUserId = userId;
				}
			});
		}

		console.log('Current user flame:', currentUserFlame, 'CurrentUserId:', currentUserId);
		if (currentUserFlame) {
			// Add emote near user's position with animation
			const emoteId = `local-${Date.now()}`;
			const newEmote = {
				id: emoteId,
				emoji,
				sender: { name: 'You', id: currentUserId },
				x: currentUserFlame.x + (Math.random() - 0.5) * 60,
				y: currentUserFlame.y - 40,
				timestamp: Date.now()
			};
			// Use array spread to ensure reactivity
			receivedEmotes = [...receivedEmotes, newEmote];
			console.log('Added local emote:', newEmote);
			console.log('Total emotes now:', receivedEmotes.length);

			// Remove after animation
			setTimeout(() => {
				receivedEmotes = receivedEmotes.filter(e => e.id !== emoteId);
			}, 5000);
		}

		try {
			// If no selected user, broadcast to all users viewing the page
			const body = selectedUser
				? {
					recipientId: selectedUser.userId,
					emoji,
					context: 'listening-now'
				}
				: {
					emoji,
					context: 'listening-now-broadcast',
					broadcast: true
				};

			const response = await fetch('/api/emotes/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			if (response.ok) {
				const result = await response.json();
				console.log('Emote sent successfully:', result);
			} else {
				const error = await response.json();
				console.error('Failed to send emote:', error);
			}
		} catch (err) {
			console.error('Error sending emote:', err);
		}
	}

	// Show emote picker for a user
	function showEmotePickerForUser() {
		showMenu = false;
		emotePickerPosition = { x: menuPosition.x, y: menuPosition.y };
		showEmotePicker = true;
	}

	// Animation functions
	function drawWave(colors: string[], seed: number, time: number) {
		const width = canvas.width;
		const height = canvas.height;

		// Clear canvas with fade effect
		ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		ctx.fillRect(0, 0, width, height);

		// Draw multiple waves
		colors.forEach((color, index) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();

			for (let x = 0; x < width; x += 5) {
				const y = height / 2 +
					Math.sin((x + time) * 0.01 + index) * 50 * Math.sin(seed * 0.001) +
					Math.sin((x + time) * 0.02 + index * 2) * 30;

				if (x === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			ctx.stroke();
		});
	}

	function drawPulse(colors: string[], seed: number, time: number) {
		const width = canvas.width;
		const height = canvas.height;
		const centerX = width / 2;
		const centerY = height / 2;

		// Clear canvas
		ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
		ctx.fillRect(0, 0, width, height);

		// Draw pulsing circles
		colors.forEach((color, index) => {
			const radius = (Math.sin(time * 0.01 + index) + 1) * 100 + index * 50;
			const alpha = 0.3 + Math.sin(time * 0.02 + index) * 0.2;

			ctx.strokeStyle = color;
			ctx.globalAlpha = alpha;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
			ctx.stroke();
		});

		ctx.globalAlpha = 1;
	}

	function drawSpiral(colors: string[], seed: number, time: number) {
		const width = canvas.width;
		const height = canvas.height;
		const centerX = width / 2;
		const centerY = height / 2;

		// Clear canvas with fade
		ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
		ctx.fillRect(0, 0, width, height);

		// Draw spiraling lines
		colors.forEach((color, colorIndex) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();

			for (let i = 0; i < 200; i++) {
				const angle = i * 0.1 + time * 0.01 + colorIndex;
				const radius = i * 2;
				const x = centerX + Math.cos(angle) * radius;
				const y = centerY + Math.sin(angle) * radius;

				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			ctx.stroke();
		});
	}

	function drawParticles(colors: string[], seed: number, time: number) {
		const width = canvas.width;
		const height = canvas.height;

		// Clear canvas
		ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		ctx.fillRect(0, 0, width, height);

		// Draw particles
		for (let i = 0; i < 100; i++) {
			const x = (seed * i * 13 + time * 2) % width;
			const y = height / 2 + Math.sin((seed * i + time) * 0.01) * height / 3;
			const colorIndex = i % colors.length;
			const size = 2 + Math.sin(seed * i * 0.1 + time * 0.02) * 2;

			ctx.fillStyle = colors[colorIndex];
			ctx.globalAlpha = 0.7;
			ctx.beginPath();
			ctx.arc(x, y, size, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}

	// Draw simple dots for each user
	function drawUserFlames(time: number) {
		if (!ctx || !canvas) return;

		// Clear clickable areas for this frame
		clickableAreas = [];

		// Update user positions (use trackListeners to only show current track listeners)
		trackListeners.forEach((listener, index) => {
			if (!listener.user) return;

			const userId = listener.user.id;
			const volume = listener.volume || 50; // Default to 50% if no volume
			const isCurrentUser = userId === currentUserId;

			// Initialize user position if not exists
			if (!userFlames.has(userId)) {
				let initX, initY;

				// Check for server-provided position first (for all users)
				if (listener.positionX !== null && listener.positionY !== null && listener.positionX !== undefined && listener.positionY !== undefined) {
					initX = listener.positionX;
					initY = listener.positionY;
				} else if (isCurrentUser && userCustomPosition) {
					// Use locally saved position for current user if no server position
					initX = userCustomPosition.x;
					initY = userCustomPosition.y;
				} else {
					// Default: arrange users in a circle
					const angle = (index / Math.max(trackListeners.length, 1)) * Math.PI * 2;
					const radius = Math.min(canvas.width, canvas.height) * 0.25;
					const centerX = canvas.width / 2;
					const centerY = canvas.height / 2;
					initX = centerX + Math.cos(angle) * radius;
					initY = centerY + Math.sin(angle) * radius;
				}

				userFlames.set(userId, {
					x: initX,
					y: initY,
					targetX: initX,
					targetY: initY,
					velocityX: 0,
					velocityY: 0,
					particles: [],
					userId: listener.user.id,
					userName: listener.user.name || 'User',
					spotifyId: listener.user.spotifyId,
					isCurrentUser,
					isMoving: false,
					moveStartTime: 0
				});
			}

			const position = userFlames.get(userId)!;
			position.isCurrentUser = isCurrentUser;

			// For current user, use custom position if available
			if (isCurrentUser && userCustomPosition) {
				position.targetX = userCustomPosition.x;
				position.targetY = userCustomPosition.y;

				// Apply spring physics for bouncy movement (same as other users)
				const springStiffness = 0.18; // Slightly faster response for current user
				const damping = 0.65; // More bounce (lower = more bouncy)
				const mass = 1.0;

				// Calculate spring force
				const dx = position.targetX - position.x;
				const dy = position.targetY - position.y;

				// Apply spring force to velocity
				position.velocityX += (dx * springStiffness) / mass;
				position.velocityY += (dy * springStiffness) / mass;

				// Apply damping to velocity
				position.velocityX *= damping;
				position.velocityY *= damping;

				// Update position based on velocity
				position.x += position.velocityX;
				position.y += position.velocityY;

				// Check if we've reached the target (within threshold)
				const distance = Math.sqrt(dx * dx + dy * dy);
				if (distance < 1 && Math.abs(position.velocityX) < 0.1 && Math.abs(position.velocityY) < 0.1) {
					position.x = position.targetX;
					position.y = position.targetY;
					position.velocityX = 0;
					position.velocityY = 0;
					position.isMoving = false;
				} else {
					position.isMoving = true; // Mark as moving for visual effects
				}
			} else if (!isCurrentUser) {
				// For other users, target position is either from real-time updates or server data
				// The targetX/targetY is already set from:
				// 1. Initial server data (listener.positionX/Y)
				// 2. Real-time position stream updates
				// 3. Default circle arrangement if no custom position

				// Only set default circle position if no custom position exists
				if (position.targetX === position.x && position.targetY === position.y &&
					(listener.positionX === null || listener.positionX === undefined)) {
					const angle = (index / Math.max(trackListeners.length, 1)) * Math.PI * 2;
					const radius = Math.min(canvas.width, canvas.height) * 0.25;
					const centerX = canvas.width / 2;
					const centerY = canvas.height / 2;
					position.targetX = centerX + Math.cos(angle) * radius;
					position.targetY = centerY + Math.sin(angle) * radius;
				}

				// Spring physics for bouncy movement
				const springStiffness = 0.12; // How quickly it moves to target
				const damping = 0.75; // How quickly oscillations die down (lower = more bouncy)
				const mass = 1.0;

				// Calculate spring force
				const dx = position.targetX - position.x;
				const dy = position.targetY - position.y;

				// Apply spring force to velocity
				position.velocityX += (dx * springStiffness) / mass;
				position.velocityY += (dy * springStiffness) / mass;

				// Apply damping to velocity
				position.velocityX *= damping;
				position.velocityY *= damping;

				// Update position based on velocity
				position.x += position.velocityX;
				position.y += position.velocityY;

				// Check if we've reached the target (within threshold)
				const distance = Math.sqrt(dx * dx + dy * dy);
				if (distance < 1 && Math.abs(position.velocityX) < 0.1 && Math.abs(position.velocityY) < 0.1) {
					position.x = position.targetX;
					position.y = position.targetY;
					position.velocityX = 0;
					position.velocityY = 0;
					position.isMoving = false;
				}
			}

			// Calculate dot size and opacity based on volume
			const baseSize = 8;
			const maxSize = 20;
			const dotSize = baseSize + (volume / 100) * (maxSize - baseSize);
			const opacity = 0.3 + (volume / 100) * 0.7;

			// Check if this user is being hovered or is being listened along with
			const isHovered = hoveredUserId === userId;
			const isListeningTarget = currentListenAlongTarget === userId;

			// Draw special indicator for current user
			if (isCurrentUser) {
				ctx.save();
				// Draw "YOU" text below the flame
				ctx.globalAlpha = 0.9;
				ctx.fillStyle = '#FFD700';
				ctx.fillRect(position.x - 30, position.y + dotSize + 35, 60, 18);
				ctx.fillStyle = '#000';
				ctx.font = 'bold 10px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('YOU', position.x, position.y + dotSize + 47);
				ctx.restore();
			}

			// Draw listening along indicator (pulsing ring)
			if (isListeningTarget && !isCurrentUser) {
				ctx.save();
				const pulseSize = dotSize * 3 + Math.sin(time * 0.005) * 10;
				ctx.strokeStyle = '#1DB954';
				ctx.lineWidth = 4;
				ctx.globalAlpha = 0.6 + Math.sin(time * 0.005) * 0.3;
				ctx.beginPath();
				ctx.arc(position.x, position.y, pulseSize, 0, Math.PI * 2);
				ctx.stroke();

				// Add inner ring
				ctx.strokeStyle = '#1DB954';
				ctx.lineWidth = 2;
				ctx.globalAlpha = 0.8;
				ctx.beginPath();
				ctx.arc(position.x, position.y, dotSize * 2.5, 0, Math.PI * 2);
				ctx.stroke();
				ctx.restore();

				// Draw "Listening Along" badge
				ctx.save();
				ctx.globalAlpha = 0.9;
				ctx.fillStyle = '#1DB954';
				ctx.fillRect(position.x - 50, position.y + dotSize + 25, 100, 20);
				ctx.fillStyle = '#000';
				ctx.font = 'bold 11px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('LISTENING ALONG', position.x, position.y + dotSize + 38);
				ctx.restore();
			}

			// Draw hover highlight
			if (isHovered && !isListeningTarget) {
				ctx.save();
				ctx.strokeStyle = '#fff';
				ctx.lineWidth = 2;
				ctx.globalAlpha = 0.8;
				ctx.beginPath();
				ctx.arc(position.x, position.y, dotSize * 3, 0, Math.PI * 2);
				ctx.stroke();
				ctx.restore();

				// Draw tooltip-like text above the flame
				ctx.save();
				ctx.globalAlpha = 0.9;
				ctx.fillStyle = '#000';
				ctx.fillRect(position.x - 65, position.y - dotSize * 3 - 30, 130, 24);
				ctx.fillStyle = '#fff';
				ctx.font = '11px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('Long press for menu', position.x, position.y - dotSize * 3 - 12);
				ctx.restore();
			}

			// Draw motion trail for moving flames
			if (position.isMoving) {
				const speed = Math.sqrt(position.velocityX * position.velocityX + position.velocityY * position.velocityY);

				// Add trail particles during movement
				if (speed > 1 && Math.random() < 0.5) {
					position.particles.push({
						x: position.x + (Math.random() - 0.5) * 10,
						y: position.y + (Math.random() - 0.5) * 10,
						life: 1.0,
						size: Math.random() * 3 + 2
					});
				}

				// Update and draw trail particles
				position.particles = position.particles.filter(particle => {
					particle.life -= 0.05;
					particle.y -= 1; // Float upward

					if (particle.life > 0) {
						ctx.save();
						ctx.globalAlpha = particle.life * 0.3;
						ctx.fillStyle = '#FFD700';
						ctx.shadowBlur = 10;
						ctx.shadowColor = '#FFD700';
						ctx.beginPath();
						ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
						ctx.fill();
						ctx.restore();
						return true;
					}
					return false;
				});
			}

			// Calculate squash and stretch based on velocity
			let scaleX = 1;
			let scaleY = 1;
			let rotation = 0; // Keep flame upright - no rotation

			if (position.isMoving) {
				const speed = Math.sqrt(position.velocityX * position.velocityX + position.velocityY * position.velocityY);

				if (speed > 0.5) {
					// Apply squash and stretch for bounce effect (without rotation)
					// Squash horizontally and stretch vertically when moving
					const bounceFactor = Math.min(1.4, 1 + speed * 0.015);

					// Squash width when bouncing
					scaleX = 1 / Math.sqrt(bounceFactor);
					// Stretch height when bouncing
					scaleY = bounceFactor;
				}
			}

			// Save context for transform
			ctx.save();
			ctx.translate(position.x, position.y);
			ctx.rotate(rotation);
			ctx.scale(scaleX, scaleY);
			ctx.translate(-position.x, -position.y);

			// Draw flame-like shape
			const flameHeight = dotSize * 2.5;
			const flicker = Math.sin(time * 0.003 + index * 2) * 0.1;

			// Draw outer glow (with movement pulse)
			const movementPulse = position.isMoving ? 1.2 : 1;
			const glowSize = flameHeight * 2 * movementPulse;
			const gradient = ctx.createRadialGradient(
				position.x, position.y + flameHeight * 0.3, 0,
				position.x, position.y + flameHeight * 0.3, glowSize
			);
			gradient.addColorStop(0, `rgba(255, ${200}, 0, ${opacity * 0.3})`);
			gradient.addColorStop(0.5, `rgba(255, ${100 + volume}, 0, ${opacity * 0.2})`);
			gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(position.x, position.y, glowSize, 0, Math.PI * 2);
			ctx.fill();

			// Draw flame layers (inner to outer)
			for (let layer = 3; layer >= 0; layer--) {
				const layerScale = 1 - (layer * 0.2);
				const layerHeight = flameHeight * layerScale * (1 + flicker);
				const layerWidth = dotSize * layerScale;

				// Color transitions from blue core to yellow edge
				let r, g, b, a;
				if (layer === 0) {
					// Hottest part - blue/white core
					r = 200 + volume * 0.5;
					g = 200 + volume * 0.5;
					b = 255;
					a = opacity;
				} else if (layer === 1) {
					// White-yellow
					r = 255;
					g = 250;
					b = 200;
					a = opacity * 0.9;
				} else if (layer === 2) {
					// Orange
					r = 255;
					g = 180;
					b = 50;
					a = opacity * 0.7;
				} else {
					// Red outer flame
					r = 255;
					g = 80;
					b = 0;
					a = opacity * 0.5;
				}

				ctx.globalAlpha = a;
				ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;

				// Draw teardrop flame shape
				ctx.beginPath();
				ctx.moveTo(position.x, position.y - layerHeight);
				ctx.quadraticCurveTo(
					position.x + layerWidth, position.y - layerHeight * 0.3,
					position.x, position.y + layerHeight * 0.2
				);
				ctx.quadraticCurveTo(
					position.x - layerWidth, position.y - layerHeight * 0.3,
					position.x, position.y - layerHeight
				);
				ctx.fill();
			}

			// Restore context after transforms
			ctx.restore();

			// Draw user name below the dot (after restoring context)
			ctx.globalAlpha = 0.6;
			ctx.fillStyle = '#ffffff';
			ctx.font = '11px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(listener.user.name?.split(' ')[0] || 'User', position.x, position.y + dotSize + 15);

			// Add clickable area for this user
			clickableAreas.push({
				x: position.x,
				y: position.y,
				radius: Math.max(30, dotSize * 2), // Make clickable area larger than visual
				userId: listener.user.id,
				userName: listener.user.name || 'User',
				spotifyId: listener.user.spotifyId,
				isCurrentUser
			});
		});

		// Clean up old users that are no longer listening
		const currentUserIds = new Set(trackListeners.map(l => l.user?.id).filter(Boolean));
		for (const userId of userFlames.keys()) {
			if (!currentUserIds.has(userId)) {
				userFlames.delete(userId);
			}
		}

		ctx.globalAlpha = 1;
	}

	// Draw floating emotes
	function drawEmotes(time: number) {
		if (!ctx || !canvas) return;

		receivedEmotes.forEach(emote => {
			const age = Date.now() - emote.timestamp;
			const maxAge = 5000; // 5 seconds
			const progress = age / maxAge;

			// Fade out as emote ages
			const opacity = Math.max(0, 1 - progress * progress); // Slower fade out

			// Float upward animation
			const floatY = emote.y - (progress * 80);

			// Gentle sway side to side
			const swayX = emote.x + Math.sin(time * 0.002 + emote.timestamp) * 15;

			// Size pulse with larger size
			const size = 40 + Math.sin(time * 0.004 + emote.timestamp) * 8;

			ctx.save();
			ctx.globalAlpha = opacity;

			// Draw outer glow
			ctx.shadowBlur = 30;
			ctx.shadowColor = '#FFD700';
			ctx.fillStyle = '#FFFFFF';
			ctx.font = `${size}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(emote.emoji, swayX, floatY);

			// Draw the emoji again without glow for clarity
			ctx.shadowBlur = 0;
			ctx.fillText(emote.emoji, swayX, floatY);

			// Draw sender name with background
			if (emote.sender?.name && opacity > 0.3) {
				ctx.font = 'bold 11px sans-serif';
				const nameY = floatY + size * 0.8;

				// Draw background for name
				ctx.globalAlpha = opacity * 0.7;
				ctx.fillStyle = '#000000';
				const textWidth = ctx.measureText(emote.sender.name).width;
				ctx.fillRect(swayX - textWidth/2 - 4, nameY - 8, textWidth + 8, 16);

				// Draw name
				ctx.globalAlpha = opacity;
				ctx.fillStyle = '#1DB954';
				ctx.fillText(emote.sender.name, swayX, nameY);
			}

			ctx.restore();
		});
	}

	function animate(time: number) {
		if (!ctx || !canvas) {
			animationId = requestAnimationFrame(animate);
			return;
		}

		// Clear canvas to dark background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw user dots first
		drawUserFlames(time);

		// Draw floating emotes on top
		drawEmotes(time);

		animationId = requestAnimationFrame(animate);
	}

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d')!;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;

			// Handle resize
			const handleResize = () => {
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
			};
			window.addEventListener('resize', handleResize);

			// Handle mouse down for dragging or long press menu
			const handleMouseDown = (e: MouseEvent) => {
				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				// Clear any existing long press timer
				if (longPressTimer) {
					clearTimeout(longPressTimer);
					longPressTimer = null;
				}

				// Check if clicking on any user
				const clickedUser = clickableAreas.find(area => {
					const dist = Math.sqrt(
						Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2)
					);
					return dist <= area.radius;
				});

				if (clickedUser) {
					// Store the start position for long press detection
					longPressStartPos = { x: e.clientX, y: e.clientY };
					potentialMenuTarget = clickedUser;

					if (clickedUser.isCurrentUser) {
						// For current user, allow dragging
						isDragging = true;
						dragStartPos = { x: e.clientX, y: e.clientY };
						dragOffset = {
							x: clickedUser.x - x,
							y: clickedUser.y - y
						};
						e.preventDefault();
						canvas.style.cursor = 'grabbing';
					}

					// Start long press timer for menu (for all users including current)
					longPressTimer = setTimeout(() => {
						if (potentialMenuTarget) {
							// Cancel dragging if it was active
							if (isDragging) {
								isDragging = false;
								canvas.style.cursor = 'default';
							}

							// Show menu
							selectedUser = potentialMenuTarget;
							menuPosition = {
								x: longPressStartPos.x,
								y: longPressStartPos.y
							};
							showMenu = true;
							showEmotePicker = false;
							justOpenedMenuViaLongPress = true;

							// Reset the flag after a short delay to allow normal clicks again
							setTimeout(() => {
								justOpenedMenuViaLongPress = false;
							}, 300);

							// Visual feedback - could add a small vibration effect here
							console.log('Long press detected - showing menu for:', potentialMenuTarget.userName);
						}
						longPressTimer = null;
						potentialMenuTarget = null;
					}, LONG_PRESS_DURATION);
				}
			};

			// Handle mouse move for dragging and hover effects
			const handleMouseMove = (e: MouseEvent) => {
				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				// Cancel long press if mouse moved too much
				if (longPressTimer) {
					const distance = Math.sqrt(
						Math.pow(e.clientX - longPressStartPos.x, 2) +
						Math.pow(e.clientY - longPressStartPos.y, 2)
					);
					if (distance > LONG_PRESS_MOVEMENT_THRESHOLD) {
						clearTimeout(longPressTimer);
						longPressTimer = null;
						potentialMenuTarget = null;
					}
				}

				// Handle dragging
				if (isDragging) {
					const newX = x + dragOffset.x;
					const newY = y + dragOffset.y;

					// Keep within canvas bounds
					const boundedX = Math.max(50, Math.min(canvas.width - 50, newX));
					const boundedY = Math.max(50, Math.min(canvas.height - 50, newY));

					saveUserPosition(boundedX, boundedY);
					e.preventDefault();
					return;
				}

				// Check if hovering over any user
				const hoveredUser = clickableAreas.find(area => {
					const distance = Math.sqrt(
						Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2)
					);
					return distance <= area.radius;
				});

				hoveredUserId = hoveredUser ? hoveredUser.userId : null;

				// Update cursor based on what we're hovering over
				if (hoveredUser) {
					if (hoveredUser.userId === currentUserId) {
						canvas.style.cursor = 'grab';
					} else {
						canvas.style.cursor = 'pointer';
					}
				} else {
					canvas.style.cursor = 'default';
				}
			};

			// Handle mouse up to stop dragging and cancel long press
			const handleMouseUp = (e: MouseEvent) => {
				// Cancel long press timer if it's still running (but don't close menu if it's already open)
				if (longPressTimer) {
					clearTimeout(longPressTimer);
					longPressTimer = null;
					potentialMenuTarget = null;
				}

				// Stop dragging
				if (isDragging) {
					isDragging = false;
					canvas.style.cursor = 'default';
				}
			};

			canvas.addEventListener('mousedown', handleMouseDown);
			canvas.addEventListener('mousemove', handleMouseMove);
			canvas.addEventListener('mouseup', handleMouseUp);
			window.addEventListener('mouseup', handleMouseUp); // In case mouse goes outside canvas

			// Close menu when clicking outside
			const handleClickOutside = (e: MouseEvent) => {
				// Don't close if we just opened the menu via long press
				if (justOpenedMenuViaLongPress) {
					return;
				}

				const menu = document.getElementById('user-menu');
				const emotePicker = document.getElementById('emote-picker');

				// Close menu if clicking outside of it
				if (showMenu && menu && !menu.contains(e.target as Node)) {
					showMenu = false;
				}

				// Close emote picker if clicking outside of it
				if (showEmotePicker && emotePicker && !emotePicker.contains(e.target as Node)) {
					showEmotePicker = false;
				}
			};

			// Add click handler to both document and canvas
			document.addEventListener('click', handleClickOutside);
			canvas.addEventListener('click', handleClickOutside);

			// Add keyboard event handler
			window.addEventListener('keydown', handleKeyDown);

			// Load saved user position
			loadUserPosition();

			// Start animation
			animationId = requestAnimationFrame(animate);

			// Connect to emote stream for real-time emotes
			connectEmoteStream();

			// Connect to position stream for real-time position updates
			connectPositionStream();

			// Fetch data initially and wait for currentUserId to be set
			fetchListeningData().then(() => {
				console.log('Initial fetch complete, currentUserId:', currentUserId);
			});

			// Poll for updates
			// Poll for updates every 3 seconds for more responsive updates
			interval = setInterval(fetchListeningData, 3000);

			return () => {
				window.removeEventListener('resize', handleResize);
				canvas.removeEventListener('mousedown', handleMouseDown);
				canvas.removeEventListener('mousemove', handleMouseMove);
				canvas.removeEventListener('mouseup', handleMouseUp);
				window.removeEventListener('mouseup', handleMouseUp);
				window.removeEventListener('keydown', handleKeyDown);
				document.removeEventListener('click', handleClickOutside);
				canvas.removeEventListener('click', handleClickOutside);
				// Clear any pending timers
				if (longPressTimer) {
					clearTimeout(longPressTimer);
				}
			};
		}
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
		if (interval) clearInterval(interval);
		if (syncInterval) clearInterval(syncInterval);
		if (isListeningAlong) {
			stopListenAlong();
		}
		if (emoteEventSource) {
			emoteEventSource.close();
		}
		if (positionEventSource) {
			positionEventSource.close();
		}
	});

	// Get unique listeners for current track (includes volume)
	$: trackListeners = currentTrack ?
		listeners.filter(l => l.trackId === currentTrack.id)
		.map(l => ({ ...l, volume: l.volume || 50 })) : [];
</script>

<svelte:head>
	<title>Listening Now - Harmonique</title>
</svelte:head>

<div class="fixed inset-0 bg-black overflow-hidden">
	<canvas bind:this={canvas} class="absolute inset-0"></canvas>

	<!-- Overlay with track info -->
	<div class="absolute inset-0 pointer-events-none">
		<div class="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent">
			{#if currentTrack}
				<div class="text-center">
					<h1 class="text-2xl font-bold mb-2">{currentTrack.name}</h1>
					<p class="text-gray-400">
						{currentTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
					</p>
					{#if trackListeners.length > 0}
						<p class="text-sm text-spotify-green mt-4">
							{trackListeners.length} {trackListeners.length === 1 ? 'person' : 'people'} listening
						</p>
					{/if}
				</div>
			{:else}
				<div class="text-center">
					<h1 class="text-2xl font-bold mb-2">No Track Playing</h1>
					<p class="text-gray-400">Play something on Spotify to see the visualization</p>
				</div>
			{/if}
		</div>

		<!-- Listeners avatars -->
		{#if trackListeners.length > 0}
			<div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
				<div class="flex justify-center items-center gap-2 flex-wrap">
					{#each trackListeners.slice(0, 10) as listener}
						<div class="flex flex-col items-center">
							{#if listener.user.image}
								<img
									src={listener.user.image}
									alt={listener.user.name || 'User'}
									class="w-10 h-10 rounded-full border-2 border-spotify-green/50"
									title={listener.user.name || 'Anonymous'}
								/>
							{:else}
								<div class="w-10 h-10 rounded-full border-2 border-spotify-green/50 bg-gray-700 flex items-center justify-center">
									<span class="text-xs">👤</span>
								</div>
							{/if}
							<span class="text-xs text-gray-400 mt-1">
								{listener.user.name?.split(' ')[0] || 'User'}
							</span>
						</div>
					{/each}
					{#if trackListeners.length > 10}
						<div class="text-sm text-gray-400">
							+{trackListeners.length - 10} more
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Close button and controls info -->
		<div class="absolute top-6 right-6 pointer-events-auto flex items-center gap-4">
			<div class="text-xs text-gray-300 px-3 py-2 rounded-lg"
				style="background: linear-gradient(135deg, rgba(29, 185, 84, 0.05) 0%, rgba(26, 26, 26, 0.8) 100%);
					backdrop-filter: blur(10px);
					border: 1px solid rgba(29, 185, 84, 0.15);">
				<div class="flex flex-col gap-1">
					<span>🎮 Use arrow keys or WASD to move your flame</span>
					<span>🖱️ Drag your flame with mouse</span>
					<span>😊 Press E to emote</span>
					<span>📱 Long press any user icon for menu</span>
					<span>🏠 Press Home to reset position</span>
					<span>⚡ Hold Shift for faster movement</span>
				</div>
			</div>
			<a
				href="/"
				class="px-4 py-2 rounded-full text-sm transition-all duration-200 text-gray-300 hover:text-white"
				style="background: linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, rgba(26, 26, 26, 0.8) 100%);
					backdrop-filter: blur(10px);
					border: 1px solid rgba(29, 185, 84, 0.15);"
			>
				← Back
			</a>
		</div>

		<!-- Listen Along Status -->
		{#if isListeningAlong}
			<div class="absolute top-6 left-6 pointer-events-auto">
				<div class="rounded-lg px-4 py-2 flex items-center gap-3"
					style="background: linear-gradient(135deg, rgba(29, 185, 84, 0.2) 0%, rgba(26, 26, 26, 0.8) 100%);
						backdrop-filter: blur(10px);
						border: 1px solid rgba(29, 185, 84, 0.3);">
					<div class="w-2 h-2 bg-spotify-green rounded-full animate-pulse"></div>
					<span class="text-sm text-spotify-green font-medium">Listening Along</span>
					<button
						on:click={stopListenAlong}
						class="ml-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-all duration-200"
					>
						Stop
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- User Menu -->
	{#if showMenu}
		<div
			id="user-menu"
			class="fixed z-50 rounded-xl shadow-2xl min-w-[200px] pointer-events-auto overflow-hidden"
			style="left: {menuPosition.x}px; top: {menuPosition.y}px; transform: translate(-50%, 10px);
				background: linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, rgba(26, 26, 26, 0.95) 50%, rgba(45, 45, 45, 0.95) 100%);
				backdrop-filter: blur(10px);
				border: 1px solid rgba(29, 185, 84, 0.2);"
		>
			<div class="px-4 py-3 bg-black/30 flex items-center justify-between">
				<p class="font-semibold text-sm text-white">{selectedUser?.userName || 'User'}</p>
				<button
					on:click={() => showMenu = false}
					class="text-gray-400 hover:text-spotify-green transition-all duration-200 p-1 -mr-2 hover:rotate-90"
					title="Close menu"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="py-1">
				<button
					on:click={() => {
						if (selectedUser?.spotifyId) {
							window.open(`https://open.spotify.com/user/${selectedUser.spotifyId}`, '_blank');
						}
						showMenu = false;
					}}
					class="w-full text-left px-4 py-2.5 hover:bg-spotify-green/20 transition-all duration-200 text-sm text-gray-200 hover:text-white flex items-center gap-3"
				>
					<span class="text-lg">🎵</span>
					<span>View Playlists</span>
				</button>
				{#if currentListenAlongTarget === selectedUser?.userId}
					<button
						on:click={() => {
							stopListenAlong();
							showMenu = false;
						}}
						class="w-full text-left px-4 py-2.5 hover:bg-red-500/20 transition-all duration-200 text-sm text-red-400 hover:text-red-300 flex items-center gap-3"
					>
						<span class="text-lg">⏹️</span>
						<span>Stop Listening Along</span>
					</button>
				{:else}
					<button
						on:click={() => {
							startListenAlong(selectedUser.userId);
						}}
						class="w-full text-left px-4 py-2.5 hover:bg-spotify-green/20 transition-all duration-200 text-sm text-spotify-green hover:text-white flex items-center gap-3"
					>
						<span class="text-lg">🎧</span>
						<span>Listen Along</span>
					</button>
				{/if}
				{#if selectedUser?.spotifyId}
					<button
						on:click={() => {
							window.open(`https://open.spotify.com/user/${selectedUser.spotifyId}`, '_blank');
							showMenu = false;
						}}
						class="w-full text-left px-4 py-2.5 hover:bg-spotify-green/20 transition-all duration-200 text-sm text-gray-200 hover:text-white flex items-center gap-3 border-t border-white/10 mt-1 pt-3"
					>
						<span class="text-lg">🔗</span>
						<span>Open on Spotify</span>
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Emote Picker -->
	{#if showEmotePicker}
		<div
			id="emote-picker"
			class="fixed z-50 rounded-xl shadow-2xl p-4 pointer-events-auto"
			style="left: {emotePickerPosition.x}px; top: {emotePickerPosition.y}px; transform: translate(-50%, 10px); max-width: 340px;
				background: linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, rgba(26, 26, 26, 0.95) 50%, rgba(45, 45, 45, 0.95) 100%);
				backdrop-filter: blur(10px);
				border: 1px solid rgba(29, 185, 84, 0.2);"
		>
			<div class="mb-4 flex items-center justify-between">
				<p class="text-sm font-semibold text-white">
					{selectedUser ? `Send an emote to ${selectedUser.userName}` : 'Share your vibe'}
				</p>
				<button
					on:click={() => showEmotePicker = false}
					class="text-gray-400 hover:text-spotify-green transition-all duration-200 p-1 -mr-2 -mt-2 hover:rotate-90"
					title="Close emote picker"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="grid grid-cols-8 gap-2">
				{#each popularEmotes as emoji}
					<button
						on:click={() => sendEmote(emoji)}
						class="text-2xl p-2 hover:bg-spotify-green/20 rounded-lg transition-all duration-200 hover:scale-125 backdrop-blur-sm"
						title="Send {emoji}"
					>
						{emoji}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	canvas {
		image-rendering: optimizeSpeed;
	}

	@keyframes float-up {
		0% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(-100px) scale(0.5);
			opacity: 0;
		}
	}

	/* Menu and picker animations */
	#user-menu, #emote-picker {
		animation: menu-appear 0.2s ease-out;
	}

	@keyframes menu-appear {
		0% {
			opacity: 0;
			transform: translate(-50%, 0) scale(0.95);
		}
		100% {
			opacity: 1;
			transform: translate(-50%, 10px) scale(1);
		}
	}
</style>