<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let track: any = null;
	export let isPlaying: boolean = false;
	export let progress: number = 0;
	export let duration: number = 0;
	export let volume: number = 50;

	let loading = false;
	let isSeeking = false;
	let seekPosition = 0;

	// Control playback
	async function controlPlayback(action: string, params: any = {}) {
		if (loading) return;
		loading = true;

		try {
			const response = await fetch('/api/player/controls', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ action, ...params })
			});

			if (response.ok) {
				// Emit event for parent component to refresh state
				window.dispatchEvent(new CustomEvent('player-control', { detail: { action } }));
			} else {
				console.error('Failed to control playback');
			}
		} catch (error) {
			console.error('Error controlling playback:', error);
		} finally {
			loading = false;
		}
	}

	function handlePlayPause() {
		controlPlayback(isPlaying ? 'pause' : 'play');
	}

	function handleNext() {
		controlPlayback('next');
	}

	function handlePrevious() {
		controlPlayback('previous');
	}

	function formatTime(ms: number) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	// Handle seeking
	function handleSeekStart(e: MouseEvent) {
		isSeeking = true;
		handleSeekMove(e);
	}

	function handleSeekMove(e: MouseEvent) {
		if (!isSeeking) return;

		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		const percentage = x / rect.width;
		seekPosition = Math.floor(duration * percentage);
	}

	async function handleSeekEnd() {
		if (!isSeeking) return;
		isSeeking = false;

		await controlPlayback('seek', { position_ms: seekPosition });
	}

	// Handle global mouse events for seeking
	onMount(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isSeeking) {
				const seekBar = document.getElementById('seek-bar');
				if (seekBar) {
					const rect = seekBar.getBoundingClientRect();
					const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
					const percentage = x / rect.width;
					seekPosition = Math.floor(duration * percentage);
				}
			}
		};

		const handleMouseUp = () => {
			if (isSeeking) {
				handleSeekEnd();
			}
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	});

	$: displayProgress = isSeeking ? seekPosition : progress;
</script>

<div class="custom-player">
	{#if track}
		<div class="player-content">
			<!-- Album Art and Track Info -->
			<div class="track-info">
				{#if track.album?.image}
					<img src={track.album.image} alt={track.album.name} class="album-art" />
				{:else}
					<div class="album-art-placeholder">🎵</div>
				{/if}
				<div class="track-details">
					<div class="track-name">{track.name}</div>
					<div class="artist-name">{track.artists?.map(a => a.name).join(', ')}</div>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="progress-section">
				<span class="time-display">{formatTime(displayProgress)}</span>
				<div
					id="seek-bar"
					class="progress-bar"
					on:mousedown={handleSeekStart}
					role="slider"
					aria-label="Seek"
					aria-valuemin="0"
					aria-valuemax={duration}
					aria-valuenow={displayProgress}
					tabindex="0"
				>
					<div
						class="progress-fill"
						style="width: {duration > 0 ? (displayProgress / duration) * 100 : 0}%"
					>
						<div class="progress-thumb"></div>
					</div>
				</div>
				<span class="time-display">{formatTime(duration)}</span>
			</div>

			<!-- Controls -->
			<div class="controls">
				<button
					on:click={handlePrevious}
					class="control-btn"
					disabled={loading}
					title="Previous track"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
					</svg>
				</button>

				<button
					on:click={handlePlayPause}
					class="control-btn play-pause"
					disabled={loading}
					title={isPlaying ? 'Pause' : 'Play'}
				>
					{#if isPlaying}
						<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
						</svg>
					{:else}
						<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					{/if}
				</button>

				<button
					on:click={handleNext}
					class="control-btn"
					disabled={loading}
					title="Next track"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
					</svg>
				</button>
			</div>
		</div>
	{:else}
		<div class="no-track">
			<p>No track playing</p>
		</div>
	{/if}
</div>

<style>
	.custom-player {
		background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
		border-radius: 12px;
		padding: 16px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}

	.player-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.track-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.album-art {
		width: 64px;
		height: 64px;
		border-radius: 8px;
		object-fit: cover;
	}

	.album-art-placeholder {
		width: 64px;
		height: 64px;
		border-radius: 8px;
		background: #333;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
	}

	.track-details {
		flex: 1;
		min-width: 0;
	}

	.track-name {
		font-size: 16px;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.artist-name {
		font-size: 14px;
		color: #999;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-top: 4px;
	}

	.progress-section {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.time-display {
		font-size: 12px;
		color: #999;
		min-width: 40px;
	}

	.time-display:first-child {
		text-align: right;
	}

	.progress-bar {
		flex: 1;
		height: 4px;
		background: #404040;
		border-radius: 2px;
		position: relative;
		cursor: pointer;
		transition: height 0.2s;
	}

	.progress-bar:hover {
		height: 6px;
	}

	.progress-fill {
		height: 100%;
		background: #1DB954;
		border-radius: 2px;
		position: relative;
		transition: width 0.1s linear;
	}

	.progress-thumb {
		position: absolute;
		right: -6px;
		top: 50%;
		transform: translateY(-50%);
		width: 12px;
		height: 12px;
		background: #fff;
		border-radius: 50%;
		opacity: 0;
		transition: opacity 0.2s;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.progress-bar:hover .progress-thumb {
		opacity: 1;
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 24px;
	}

	.control-btn {
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 8px;
		border-radius: 50%;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.control-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		transform: scale(1.1);
	}

	.control-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.play-pause {
		background: #1DB954;
		padding: 12px;
	}

	.play-pause:hover:not(:disabled) {
		background: #1ed760;
	}

	.no-track {
		padding: 32px;
		text-align: center;
		color: #666;
	}
</style>