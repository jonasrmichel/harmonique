<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';
	import NowPlaying from '$lib/components/NowPlaying.svelte';

	export let data: LayoutData;
</script>

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-black">
	<nav class="border-b border-gray-800">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="text-2xl font-bold text-spotify-green">
					Harmonique
				</a>

				<div class="flex items-center gap-6">
					<a href="/playlists" class="hover:text-spotify-green transition-colors">
						Playlists
					</a>
					<a href="/listening-now" class="hover:text-spotify-green transition-colors">
						Listening Now
					</a>
					<a href="/listening-with" class="hover:text-spotify-green transition-colors">
						Listening With
					</a>
					{#if data.user}
						<div class="flex items-center gap-3">
							<span class="text-sm text-gray-300">
								{data.user.name || data.user.email}
							</span>
							<button
								class="btn-secondary text-sm px-4 py-2"
								on:click|preventDefault={() => {
									window.location.replace('/auth/signout');
								}}
							>
								Logout
							</button>
						</div>
					{:else}
						<a href="/auth/login" class="btn-primary text-sm px-4 py-2">
							Connect Spotify
						</a>
					{/if}
				</div>
			</div>
		</div>
	</nav>

	<main>
		<slot />
	</main>

	<footer class="border-t border-gray-800 mt-20 mb-24">
		<div class="container mx-auto px-4 py-8">
			<p class="text-center text-gray-500 text-sm">
				&copy; 2025 Harmonique - A Spotify Social Network
			</p>
		</div>
	</footer>

	<NowPlaying user={data.user} />
</div>