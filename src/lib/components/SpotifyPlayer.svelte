<script lang="ts">
	import { onMount } from 'svelte';

	export let uri: string = ''; // spotify:track:xxx, spotify:playlist:xxx, etc.
	export let type: 'track' | 'playlist' | 'album' = 'track';
	export let height: number = 352; // 352 for full player, 152 for compact
	export let theme: 'black' | 'white' = 'black';
	export let compact: boolean = false;
	export let autoplay: boolean = false;

	let embedUrl = '';
	let finalHeight = compact ? 152 : height;
	let iframeElement: HTMLIFrameElement;

	// Only update URL when URI actually changes to prevent iframe reload
	$: if (uri) {
		const autoplayParam = autoplay ? '&autoplay=1' : '';
		const newUrl = `https://open.spotify.com/embed/${type}/${uri.split(':').pop()}?utm_source=generator&theme=${theme === 'black' ? '0' : '1'}${autoplayParam}`;
		if (newUrl !== embedUrl) {
			embedUrl = newUrl;
		}
	}

	onMount(() => {
		// Prevent iframe from being destroyed on navigation
		return () => {
			// Keep iframe alive
		};
	});
</script>

{#if embedUrl}
	<div class="spotify-player">
		<iframe
			bind:this={iframeElement}
			title="Spotify Player"
			src={embedUrl}
			width="100%"
			height={finalHeight}
			frameBorder="0"
			allowfullscreen=""
			allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
			loading="lazy"
		></iframe>
	</div>
{/if}

<style>
	.spotify-player {
		width: 100%;
		border-radius: 12px;
		overflow: hidden;
		background: #000;
	}

	iframe {
		border-radius: 12px;
	}
</style>