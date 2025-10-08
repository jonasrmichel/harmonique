<div align="center">
  <svg width="800" height="300" viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
    <!-- Background gradient -->
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#191414;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#1DB954;stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:#191414;stop-opacity:1" />
      </linearGradient>

      <!-- Flame gradient -->
      <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#FFD23F;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FFF;stop-opacity:1" />
      </linearGradient>

      <!-- Glow filter -->
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="800" height="300" fill="url(#bgGradient)"/>

    <!-- Network connections -->
    <g opacity="0.3">
      <line x1="100" y1="150" x2="200" y2="100" stroke="#1DB954" stroke-width="2"/>
      <line x1="200" y1="100" x2="300" y2="120" stroke="#1DB954" stroke-width="2"/>
      <line x1="200" y1="100" x2="250" y2="180" stroke="#1DB954" stroke-width="2"/>
      <line x1="600" y1="100" x2="700" y2="150" stroke="#1DB954" stroke-width="2"/>
      <line x1="600" y1="100" x2="550" y2="180" stroke="#1DB954" stroke-width="2"/>
      <line x1="500" y1="200" x2="600" y2="100" stroke="#1DB954" stroke-width="2"/>
    </g>

    <!-- User nodes -->
    <circle cx="100" cy="150" r="8" fill="#1DB954" opacity="0.6"/>
    <circle cx="200" cy="100" r="8" fill="#1DB954" opacity="0.6"/>
    <circle cx="300" cy="120" r="8" fill="#1DB954" opacity="0.6"/>
    <circle cx="250" cy="180" r="8" fill="#1DB954" opacity="0.6"/>
    <circle cx="700" cy="150" r="8" fill="#1DB954" opacity="0.6"/>
    <circle cx="600" cy="100" r="8" fill="#1DB954" opacity="0.6"/>
    <circle cx="550" cy="180" r="8" fill="#1DB954" opacity="0.6"/>
    <circle cx="500" cy="200" r="8" fill="#1DB954" opacity="0.6"/>

    <!-- Central flame visualization -->
    <g transform="translate(400, 150)" filter="url(#glow)">
      <!-- Outer flame -->
      <path d="M 0,-60 Q -20,-40 -15,-20 Q -10,0 0,10 Q 10,0 15,-20 Q 20,-40 0,-60 Z"
            fill="url(#flameGradient)" opacity="0.6"/>
      <!-- Inner flame -->
      <path d="M 0,-45 Q -12,-30 -8,-15 Q -5,0 0,5 Q 5,0 8,-15 Q 12,-30 0,-45 Z"
            fill="#FFF" opacity="0.8"/>
      <!-- Core -->
      <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#4FC3F7" opacity="0.9"/>
    </g>

    <!-- Sound waves -->
    <g opacity="0.4">
      <path d="M 340,150 Q 320,130 300,150 Q 320,170 340,150" stroke="#1DB954" stroke-width="2" fill="none"/>
      <path d="M 460,150 Q 480,130 500,150 Q 480,170 460,150" stroke="#1DB954" stroke-width="2" fill="none"/>
    </g>

    <!-- Title -->
    <text x="400" y="230" font-family="Arial Black, sans-serif" font-size="72" font-weight="bold"
          text-anchor="middle" fill="#1DB954">HARMONIQUE</text>

    <!-- Subtitle -->
    <text x="400" y="260" font-family="Arial, sans-serif" font-size="16"
          text-anchor="middle" fill="#B3B3B3">Real-time Music • Social Listening • Live Vibes</text>

    <!-- Musical notes floating -->
    <g opacity="0.5">
      <text x="150" y="80" font-size="20" fill="#1DB954">♪</text>
      <text x="650" y="90" font-size="16" fill="#1DB954">♫</text>
      <text x="250" y="220" font-size="18" fill="#1DB954">♪</text>
      <text x="550" y="230" font-size="20" fill="#1DB954">♫</text>
    </g>
  </svg>
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