#!/bin/bash

# List of files that need updating
files=(
    "src/routes/api/taste-profile/analyze/+server.ts"
    "src/routes/api/listen-along/sync/+server.ts"
    "src/routes/api/player/play/+server.ts"
    "src/routes/playlists/[id]/+page.server.ts"
    "src/routes/playlists/+page.server.ts"
)

for file in "${files[@]}"; do
    echo "Updating $file..."

    # Replace the hardcoded refreshAccessToken function with import
    sed -i '' '/async function refreshAccessToken/,/^}/d' "$file"

    # Replace hardcoded credentials in Authorization headers
    sed -i '' "s/'69bf2b1658984b20b7fcbe93915814f6:f2523336f86e4ba8b9cc15f293825963'/\${process.env.AUTH_SPOTIFY_ID}:\${process.env.AUTH_SPOTIFY_SECRET}/g" "$file"

    # Add import if not exists
    if ! grep -q "import { getSpotifyToken } from '\$lib/spotify-auth'" "$file"; then
        sed -i '' "1s/^/import { getSpotifyToken } from '\$lib\/spotify-auth';\n/" "$file"
    fi
done

echo "Done updating files!"