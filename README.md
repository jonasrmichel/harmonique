<div align="center">
  <img src="static/logo.svg" alt="Harmonique Logo" width="800" height="300" />
</div>

# Harmonique - Spotify Social Network

A social network for Spotify users to curate, share, and discover playlists with real-time listening visualization.

## Features

- 🎵 **Spotify Integration** - Connect your Spotify account to create and manage playlists
- 👥 **Social Features** - Follow users, like playlists, and comment on collections
- 🔍 **Discovery** - Find new music through trending playlists and genre browsing
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🎨 **Beautiful UI** - Modern dark theme with Spotify-inspired design

## Tech Stack

- **Frontend**: SvelteKit, TypeScript, Tailwind CSS
- **Backend**: SvelteKit API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js with Spotify OAuth
- **APIs**: Spotify Web API

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Spotify App credentials

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/harmonique.git
   cd harmonique
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file with your credentials:
   ```env
   # Spotify OAuth
   AUTH_SPOTIFY_ID="your-spotify-client-id"
   AUTH_SPOTIFY_SECRET="your-spotify-client-secret"

   # Auth.js
   AUTH_SECRET="generate-a-secret-here"
   AUTH_TRUST_HOST=true

   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/harmonique?schema=public"

   # Application
   PUBLIC_BASE_URL="http://localhost:5173"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev
   ```

5. **Configure Spotify App**

   In your Spotify App settings at [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard), add these redirect URIs:

   For local development:
   ```
   http://localhost:5174/auth/callback/spotify
   ```

   For production (harmonique.ouchwowboing.io):
   ```
   https://harmonique.ouchwowboing.io/auth/callback/spotify
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:5173](http://localhost:5173)

## Project Structure

```
harmonique/
├── src/
│   ├── app.html          # HTML template
│   ├── app.css           # Global styles
│   ├── auth.ts           # Auth configuration
│   ├── hooks.server.ts   # Server hooks
│   ├── lib/
│   │   ├── components/   # Reusable components
│   │   ├── db.ts        # Database client
│   │   └── spotify.ts   # Spotify API wrapper
│   └── routes/
│       ├── api/         # API endpoints
│       ├── auth/        # Auth pages
│       ├── playlists/   # Playlist pages
│       ├── profile/     # User profile
│       └── discover/    # Discovery page
├── prisma/
│   └── schema.prisma    # Database schema
├── static/              # Static assets
└── package.json        # Dependencies
```

## Database Schema

The app uses the following main models:
- **User** - Spotify users with profiles
- **Playlist** - User-created playlists
- **Track** - Songs in playlists
- **Follow** - User following relationships
- **Like** - Playlist likes
- **Comment** - Playlist comments
- **Tag** - Genre/mood tags

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type checking
- `npx prisma studio` - Open database GUI

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT