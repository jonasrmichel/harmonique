<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationId: number;
	let listeners: any[] = [];
	let currentTrack: any = null;
	let interval: NodeJS.Timeout;

	// Store flame particle positions for each user
	let userFlames: Map<string, {
		x: number;
		y: number;
		targetX: number;
		targetY: number;
		particles: any[];
		userId: string;
		userName: string;
		spotifyId?: string;
	}> = new Map();

	// Track clickable areas for each user
	let clickableAreas: Array<{
		x: number;
		y: number;
		radius: number;
		userId: string;
		userName: string;
		spotifyId?: string;
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

	// Popular emotes for quick selection
	const popularEmotes = ['❤️', '🔥', '🎵', '🎸', '🎤', '🎧', '👏', '💃', '🕺', '✨', '🌟', '💫', '🚀', '😎', '🤘', '🙌'];

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
			// Get current user's playing track
			const nowPlayingResponse = await fetch('/api/now-playing');
			if (nowPlayingResponse.ok) {
				const nowPlaying = await nowPlayingResponse.json();
				if (nowPlaying?.playing && nowPlaying?.track) {
					currentTrack = nowPlaying.track;
				}
			}

			// Get all listeners
			const listenersResponse = await fetch('/api/now-playing/update?limit=50');
			if (listenersResponse.ok) {
				const data = await listenersResponse.json();
				listeners = data.nowPlayingList || [];
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

	// View user's playlists
	function viewPlaylists(userId: string) {
		goto(`/playlists?user=${userId}`);
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
					// Add emote to display with random position around center
					const centerX = canvas.width / 2;
					const centerY = canvas.height / 2;
					const angle = Math.random() * Math.PI * 2;
					const radius = Math.min(canvas.width, canvas.height) * 0.3;

					receivedEmotes.push({
						id: data.emote.id,
						emoji: data.emote.emoji,
						sender: data.emote.sender,
						x: centerX + Math.cos(angle) * radius,
						y: centerY + Math.sin(angle) * radius,
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

	// Send an emote to a user
	async function sendEmote(emoji: string) {
		if (!selectedUser) return;

		try {
			const response = await fetch('/api/emotes/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					recipientId: selectedUser.userId,
					emoji,
					context: 'listening-now'
				})
			});

			if (response.ok) {
				showEmotePicker = false;
				// Show success feedback
				console.log(`Sent ${emoji} to ${selectedUser.userName}`);
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

			// Initialize user position if not exists
			if (!userFlames.has(userId)) {
				// Arrange users in a circle in the center of the canvas
				const angle = (index / Math.max(trackListeners.length, 1)) * Math.PI * 2;
				const radius = Math.min(canvas.width, canvas.height) * 0.25;
				const centerX = canvas.width / 2;
				const centerY = canvas.height / 2;

				userFlames.set(userId, {
					x: centerX + Math.cos(angle) * radius,
					y: centerY + Math.sin(angle) * radius,
					targetX: centerX + Math.cos(angle) * radius,
					targetY: centerY + Math.sin(angle) * radius,
					particles: [],
					userId: listener.user.id,
					userName: listener.user.name || 'User',
					spotifyId: listener.user.spotifyId
				});
			}

			const position = userFlames.get(userId)!;

			// Update positions for smooth animation when users join/leave
			const angle = (index / Math.max(trackListeners.length, 1)) * Math.PI * 2;
			const radius = Math.min(canvas.width, canvas.height) * 0.25;
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;
			position.targetX = centerX + Math.cos(angle) * radius;
			position.targetY = centerY + Math.sin(angle) * radius;

			// Smooth movement to target position with hovering effect
			const hoverX = Math.sin(time * 0.0003 + index * 0.5) * 3;
			const hoverY = Math.cos(time * 0.0004 + index * 0.7) * 3;
			position.x += (position.targetX + hoverX - position.x) * 0.1;
			position.y += (position.targetY + hoverY - position.y) * 0.1;

			// Calculate dot size and opacity based on volume
			const baseSize = 8;
			const maxSize = 20;
			const dotSize = baseSize + (volume / 100) * (maxSize - baseSize);
			const opacity = 0.3 + (volume / 100) * 0.7;

			// Check if this user is being hovered or is being listened along with
			const isHovered = hoveredUserId === userId;
			const isListeningTarget = currentListenAlongTarget === userId;

			// Draw listening along indicator (pulsing ring)
			if (isListeningTarget) {
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
				ctx.fillRect(position.x - 60, position.y - dotSize * 3 - 30, 120, 24);
				ctx.fillStyle = '#fff';
				ctx.font = '12px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('Click for options', position.x, position.y - dotSize * 3 - 12);
				ctx.restore();
			}

			// Draw flame-like shape
			const flameHeight = dotSize * 2.5;
			const flicker = Math.sin(time * 0.003 + index * 2) * 0.1;

			// Draw outer glow
			const glowSize = flameHeight * 2;
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

			// Draw user name below the dot
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
				spotifyId: listener.user.spotifyId
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
			const opacity = Math.max(0, 1 - progress);

			// Float upward animation
			const floatY = emote.y - (progress * 100);

			// Gentle sway side to side
			const swayX = emote.x + Math.sin(time * 0.002 + emote.timestamp) * 20;

			// Size pulse
			const size = 30 + Math.sin(time * 0.003 + emote.timestamp) * 5;

			ctx.save();
			ctx.globalAlpha = opacity;
			ctx.font = `${size}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			// Draw glow effect
			ctx.shadowBlur = 20;
			ctx.shadowColor = '#1DB954';
			ctx.fillText(emote.emoji, swayX, floatY);

			// Draw sender name
			if (emote.sender?.name) {
				ctx.font = '12px sans-serif';
				ctx.fillStyle = '#1DB954';
				ctx.shadowBlur = 0;
				ctx.fillText(emote.sender.name, swayX, floatY + size);
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

		// Draw user dots
		drawUserFlames(time);

		// Draw floating emotes
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

			// Handle mouse movement for cursor change
			const handleMouseMove = (e: MouseEvent) => {
				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				// Check if hovering over any user
				const hoveredUser = clickableAreas.find(area => {
					const distance = Math.sqrt(
						Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2)
					);
					return distance <= area.radius;
				});

				hoveredUserId = hoveredUser ? hoveredUser.userId : null;
				canvas.style.cursor = hoveredUser ? 'pointer' : 'default';
			};
			canvas.addEventListener('mousemove', handleMouseMove);

			// Handle clicks on users
			const handleClick = (e: MouseEvent) => {
				const rect = canvas.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				// Check if clicked on any user
				const clickedUser = clickableAreas.find(area => {
					const distance = Math.sqrt(
						Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2)
					);
					return distance <= area.radius;
				});

				if (clickedUser) {
					// Show menu instead of opening Spotify
					selectedUser = clickedUser;
					menuPosition = {
						x: e.clientX,
						y: e.clientY
					};
					showMenu = true;
				}
			};
			canvas.addEventListener('click', handleClick);

			// Close menu when clicking outside
			const handleClickOutside = (e: MouseEvent) => {
				const menu = document.getElementById('user-menu');
				if (showMenu && menu && !menu.contains(e.target as Node)) {
					showMenu = false;
				}
			};
			document.addEventListener('click', handleClickOutside);

			// Start animation
			animationId = requestAnimationFrame(animate);

			// Connect to emote stream for real-time emotes
			connectEmoteStream();

			// Fetch data initially
			fetchListeningData();

			// Poll for updates
			interval = setInterval(fetchListeningData, 5000);

			return () => {
				window.removeEventListener('resize', handleResize);
				canvas.removeEventListener('mousemove', handleMouseMove);
				canvas.removeEventListener('click', handleClick);
				document.removeEventListener('click', handleClickOutside);
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

		<!-- Close button -->
		<a
			href="/"
			class="absolute top-6 right-6 pointer-events-auto px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full text-sm transition-colors"
		>
			← Back
		</a>

		<!-- Listen Along Status -->
		{#if isListeningAlong}
			<div class="absolute top-6 left-6 pointer-events-auto">
				<div class="bg-spotify-green/20 border border-spotify-green rounded-lg px-4 py-2 flex items-center gap-3">
					<div class="w-2 h-2 bg-spotify-green rounded-full animate-pulse"></div>
					<span class="text-sm text-spotify-green font-medium">Listening Along</span>
					<button
						on:click={stopListenAlong}
						class="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
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
			class="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-lg py-2 min-w-[180px] pointer-events-auto"
			style="left: {menuPosition.x}px; top: {menuPosition.y}px; transform: translate(-50%, 10px);"
		>
			<div class="px-4 py-2 border-b border-gray-700">
				<p class="font-semibold text-sm">{selectedUser?.userName || 'User'}</p>
			</div>
			<button
				on:click={() => {
					viewPlaylists(selectedUser.userId);
					showMenu = false;
				}}
				class="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-sm"
			>
				🎵 View Playlists
			</button>
			<button
				on:click={showEmotePickerForUser}
				class="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-sm"
			>
				😊 Send Emote
			</button>
			{#if currentListenAlongTarget === selectedUser?.userId}
				<button
					on:click={() => {
						stopListenAlong();
						showMenu = false;
					}}
					class="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-sm text-red-400"
				>
					⏹️ Stop Listening Along
				</button>
			{:else}
				<button
					on:click={() => {
						startListenAlong(selectedUser.userId);
					}}
					class="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-sm text-spotify-green"
				>
					🎧 Listen Along
				</button>
			{/if}
			{#if selectedUser?.spotifyId}
				<button
					on:click={() => {
						window.open(`https://open.spotify.com/user/${selectedUser.spotifyId}`, '_blank');
						showMenu = false;
					}}
					class="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-sm"
				>
					🔗 Open in Spotify
				</button>
			{/if}
		</div>
	{/if}

	<!-- Emote Picker -->
	{#if showEmotePicker}
		<div
			id="emote-picker"
			class="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 pointer-events-auto"
			style="left: {emotePickerPosition.x}px; top: {emotePickerPosition.y}px; transform: translate(-50%, 10px); max-width: 320px;"
		>
			<div class="mb-3">
				<p class="text-sm font-semibold text-gray-300 mb-2">Send an emote to {selectedUser?.userName}</p>
			</div>
			<div class="grid grid-cols-8 gap-2">
				{#each popularEmotes as emoji}
					<button
						on:click={() => sendEmote(emoji)}
						class="text-2xl p-2 hover:bg-gray-800 rounded transition-colors hover:scale-110"
						title="Send {emoji}"
					>
						{emoji}
					</button>
				{/each}
			</div>
			<button
				on:click={() => showEmotePicker = false}
				class="mt-3 w-full px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
			>
				Cancel
			</button>
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
</style>