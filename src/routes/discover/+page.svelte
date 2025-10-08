<script lang="ts">
	import type { PageData } from './$types';
	import PlaylistCard from '$lib/components/PlaylistCard.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>Discover - Harmonique</title>
</svelte:head>

<section class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold mb-8">Discover Music</h1>

	<!-- Trending Playlists -->
	<div class="mb-12">
		<h2 class="text-2xl font-semibold mb-6">Trending Now</h2>
		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#if data.trending?.length}
				{#each data.trending as playlist}
					<PlaylistCard {playlist} />
				{/each}
			{:else}
				<p class="text-gray-400">No trending playlists</p>
			{/if}
		</div>
	</div>

	<!-- Recently Added -->
	<div class="mb-12">
		<h2 class="text-2xl font-semibold mb-6">Fresh Playlists</h2>
		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#if data.recent?.length}
				{#each data.recent as playlist}
					<PlaylistCard {playlist} />
				{/each}
			{:else}
				<p class="text-gray-400">No recent playlists</p>
			{/if}
		</div>
	</div>

	<!-- Categories -->
	<div>
		<h2 class="text-2xl font-semibold mb-6">Browse by Genre</h2>
		<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
			{#each ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Indie', 'Jazz', 'Classical', 'R&B', 'Country', 'Metal', 'Latin', 'Alternative'] as genre}
				<a
					href="/playlists?tag={genre.toLowerCase()}"
					class="bg-gradient-to-br from-spotify-green/30 to-transparent rounded-lg p-6 text-center hover:scale-105 transition-transform"
				>
					<span class="font-semibold">{genre}</span>
				</a>
			{/each}
		</div>
	</div>
</section>