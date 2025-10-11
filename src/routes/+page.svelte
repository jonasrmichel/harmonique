<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Harmonique - Spotify Social Network</title>
</svelte:head>

<section class="container mx-auto px-4 py-16">
	<div class="max-w-4xl mx-auto text-center">
		<h1 class="text-5xl md:text-6xl font-bold mb-6">
			Enhance Your Musical Journey
		</h1>
		<p class="text-xl text-gray-400 mb-8">
			Made by human ears, for human ears
		</p>

		{#if !data.user}
			<div class="flex gap-4 justify-center">
				<a href="/auth/login" class="btn-primary">
					Get Started with Spotify
				</a>
				<a href="/playlists" class="btn-secondary">
					Explore Playlists
				</a>
			</div>
		{:else}
			<div class="flex gap-4 justify-center">
				<a href="/playlists" class="btn-primary">
					View Playlists
				</a>
				<a href="/listening-now" class="btn-secondary">
					See Who's Listening
				</a>
			</div>
		{/if}
	</div>
</section>

<section class="container mx-auto px-4 py-16">
	<h2 class="text-3xl font-bold mb-8 text-center">Features</h2>

	<div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
		<div class="card">
			<div class="text-spotify-green text-4xl mb-4">🎵</div>
			<h3 class="text-xl font-semibold mb-2">Curate Playlists</h3>
			<p class="text-gray-400">
				Create and organize your playlists with Spotify integration. Add descriptions, cover art, and tags to make them discoverable.
			</p>
		</div>

		<div class="card">
			<div class="text-spotify-green text-4xl mb-4">👥</div>
			<h3 class="text-xl font-semibold mb-2">Follow & Connect</h3>
			<p class="text-gray-400">
				Follow other music enthusiasts, discover their playlists, and build your music network.
			</p>
		</div>

		<a href="/listening-now" class="card hover:border-spotify-green/50 transition-colors cursor-pointer">
			<div class="text-spotify-green text-4xl mb-4">🔥</div>
			<h3 class="text-xl font-semibold mb-2">Listening Now</h3>
			<p class="text-gray-400">
				See who's listening in real-time with beautiful visualizations. Click on users to listen along with them.
			</p>
		</a>

		<a href="/listening-with" class="card hover:border-spotify-green/50 transition-colors cursor-pointer">
			<div class="text-spotify-green text-4xl mb-4">🎧</div>
			<h3 class="text-xl font-semibold mb-2">Listening With</h3>
			<p class="text-gray-400">
				Track who's synced up and listening along with your music. See real-time stats and manage your listeners.
			</p>
		</a>

		<div class="card">
			<div class="text-spotify-green text-4xl mb-4">🎯</div>
			<h3 class="text-xl font-semibold mb-2">Listen Along</h3>
			<p class="text-gray-400">
				Sync your Spotify playback with friends in real-time. Experience music together, no matter where you are.
			</p>
		</div>
	</div>
</section>

{#if !data.user}
	<section class="container mx-auto px-4 py-16">
		<div class="bg-spotify-green/10 border border-spotify-green/30 rounded-lg p-8 max-w-2xl mx-auto text-center">
			<h2 class="text-2xl font-bold mb-4">Ready to Start?</h2>
			<p class="text-gray-300 mb-6">
				Connect your Spotify account to start creating and sharing playlists with the community.
			</p>
			<a href="/auth/login" class="btn-primary inline-block">
				Connect Spotify Account
			</a>
		</div>
	</section>
{/if}