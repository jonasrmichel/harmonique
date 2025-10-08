import { SvelteKitAuth } from "@auth/sveltekit";
import Spotify from "@auth/core/providers/spotify";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import type { Session } from "@auth/core/types";

const prisma = new PrismaClient();

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: PrismaAdapter(prisma),
	providers: [
		Spotify({
			clientId: process.env.AUTH_SPOTIFY_ID!,
			clientSecret: process.env.AUTH_SPOTIFY_SECRET!,
			authorization: {
				params: {
					scope: "user-read-email user-read-private playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-follow-read user-follow-modify user-library-read streaming user-read-playback-state user-modify-playback-state"
				}
			}
		})
	],
	trustHost: true,
	callbacks: {
		async session({ session, user }: { session: Session; user: any }) {
			if (session.user) {
				session.user.id = user.id;

				// Get the Spotify account details
				const account = await prisma.account.findFirst({
					where: {
						userId: user.id,
						provider: "spotify"
					}
				});

				if (account) {
					// Store Spotify ID in user profile if not already there
					if (!user.spotifyId) {
						await prisma.user.update({
							where: { id: user.id },
							data: { spotifyId: account.providerAccountId }
						});
					}

					// Add tokens to session for API calls
					session.accessToken = account.access_token;
					session.refreshToken = account.refresh_token;
				}
			}
			return session;
		}
	},
	pages: {
		signIn: "/auth/login",
		error: "/auth/error"
	},
	secret: process.env.AUTH_SECRET
});