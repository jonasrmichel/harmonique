#!/usr/bin/env python3
"""
Script to remove hardcoded Spotify credentials from all files
"""

import re
import os

files_to_update = [
    "src/routes/api/taste-profile/analyze/+server.ts",
    "src/routes/api/listen-along/sync/+server.ts",
    "src/routes/playlists/[id]/+page.server.ts",
    "src/routes/playlists/+page.server.ts"
]

def update_file(filepath):
    """Update a file to remove hardcoded credentials"""

    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # Pattern 1: Remove the refreshAccessToken function
    pattern = r'async function refreshAccessToken\(refreshToken: string\) \{[\s\S]*?\n\}'
    content = re.sub(pattern, '', content)

    # Pattern 2: Replace hardcoded credentials in Authorization header
    content = content.replace(
        "'69bf2b1658984b20b7fcbe93915814f6:f2523336f86e4ba8b9cc15f293825963'",
        "${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}"
    )

    # Pattern 3: Add import if not exists and file uses tokens
    if 'getSpotifyToken' not in content and 'accounts' in content:
        # Add import at the top after existing imports
        import_line = "import { getSpotifyToken } from '$lib/spotify-auth';"
        if import_line not in content:
            # Find the last import line
            import_match = re.search(r'^(import[\s\S]*?;)(?=\n\n|\nconst|\nexport)', content, re.MULTILINE)
            if import_match:
                content = content[:import_match.end()] + '\n' + import_line + content[import_match.end():]
            else:
                content = import_line + '\n\n' + content

    # Pattern 4: Replace the token refresh logic
    # This is more complex and needs careful replacement
    old_pattern = r'''const account = session\.user\.accounts\[0\];
\s*let accessToken = account\.access_token;

\s*// Check if token is expired[\s\S]*?catch \(err\) \{[\s\S]*?\}
\s*\}
\s*\}'''

    new_code = '''// Get a valid Spotify token (handles refresh automatically)
		const accessToken = await getSpotifyToken(session.user.id);

		if (!accessToken) {
			return json({ error: 'No Spotify account connected or failed to refresh token' }, { status: 401 });
		}'''

    content = re.sub(old_pattern, new_code, content, flags=re.MULTILINE)

    # Pattern 5: Update the session query to not include accounts
    content = content.replace(
        '''include: {
				user: {
					include: {
						accounts: {
							where: { provider: 'spotify' }
						}
					}
				}
			}''',
        '''include: {
				user: true
			}'''
    )

    # Pattern 6: Update the user check
    content = content.replace(
        "if (!session?.user?.accounts?.[0])",
        "if (!session?.user)"
    )

    # Write back if changed
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✅ Updated: {filepath}")
    else:
        print(f"⏭️  No changes needed: {filepath}")

# Update all files
for filepath in files_to_update:
    update_file(filepath)

print("\n✨ Done! All hardcoded credentials have been removed.")
print("Make sure your .env file contains:")
print("  AUTH_SPOTIFY_ID=your_client_id")
print("  AUTH_SPOTIFY_SECRET=your_client_secret")
print("  PUBLIC_BASE_URL=https://test.harmonique.io")