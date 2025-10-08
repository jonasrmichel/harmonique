<script lang="ts">
</script>

<svelte:head>
	<title>Login - Harmonique</title>
</svelte:head>

<div class="container mx-auto px-4 py-16">
	<div class="max-w-md mx-auto">
		<div class="bg-gray-800/50 rounded-lg p-8">
			<h1 class="text-3xl font-bold mb-6 text-center">Welcome to Harmonique</h1>

			<div class="text-center mb-8">
				<div class="text-6xl mb-4">🎵</div>
				<p class="text-gray-400">
					Connect your Spotify account to start creating and sharing playlists with the community.
				</p>
			</div>

			<form method="POST" action="?/spotify">
				<input type="hidden" name="provider" value="spotify" />
				<button
					type="submit"
					class="w-full btn-primary flex items-center justify-center gap-3"
				>
					<svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
					</svg>
					Connect with Spotify
				</button>
			</form>

			<div class="mt-8 pt-8 border-t border-gray-700">
				<h2 class="text-lg font-semibold mb-4">Why Connect Spotify?</h2>
				<ul class="space-y-3 text-sm text-gray-400">
					<li class="flex items-start gap-2">
						<span class="text-spotify-green">✓</span>
						<span>Create and manage playlists directly from Harmonique</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-spotify-green">✓</span>
						<span>Import your existing Spotify playlists</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-spotify-green">✓</span>
						<span>Play music directly in the app</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-spotify-green">✓</span>
						<span>Discover music through friends and the community</span>
					</li>
				</ul>
			</div>

			<div class="mt-6 text-center text-xs text-gray-500">
				By connecting, you agree to our Terms of Service and Privacy Policy
			</div>
		</div>
	</div>
</div>