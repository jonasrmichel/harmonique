<div align="center">
  <svg width="800" height="300" viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Harmonic gradient - represents musical harmony -->
      <linearGradient id="harmonicGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#1DB954;stop-opacity:0.8">
          <animate attributeName="stop-opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite"/>
        </stop>
        <stop offset="50%" style="stop-color:#1ED760;stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#1DB954;stop-opacity:0.8">
          <animate attributeName="stop-opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite"/>
        </stop>
      </linearGradient>

      <!-- Pulse gradient - represents live/real-time activity -->
      <radialGradient id="pulseGradient">
        <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1"/>
        <stop offset="50%" style="stop-color:#FFD23F;stop-opacity:0.8"/>
        <stop offset="100%" style="stop-color:#1DB954;stop-opacity:0.3"/>
      </radialGradient>

      <!-- Background gradient -->
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#0A0E27;stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#191414;stop-opacity:1"/>
      </linearGradient>

      <!-- Social network gradient -->
      <linearGradient id="networkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1DB954;stop-opacity:0"/>
        <stop offset="50%" style="stop-color:#1DB954;stop-opacity:0.5"/>
        <stop offset="100%" style="stop-color:#1DB954;stop-opacity:0"/>
      </linearGradient>

      <!-- Glow effect -->
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <!-- Soft glow -->
      <filter id="softGlow">
        <feGaussianBlur stdDeviation="2"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="800" height="300" fill="url(#bgGradient)"/>

    <!-- Harmonic wave pattern background -->
    <g opacity="0.1">
      <path d="M 0,150 Q 100,100 200,150 T 400,150 T 600,150 T 800,150"
            stroke="#1DB954" stroke-width="1" fill="none"/>
      <path d="M 0,150 Q 100,200 200,150 T 400,150 T 600,150 T 800,150"
            stroke="#1DB954" stroke-width="1" fill="none"/>
    </g>

    <!-- Central Harmonique Symbol - Abstract H formed by sound waves -->
    <g transform="translate(400, 120)">
      <!-- Left vertical harmonic wave -->
      <path d="M -40,0 Q -35,-20 -40,-40 Q -35,-60 -40,-80"
            stroke="url(#harmonicGradient)" stroke-width="4" fill="none" filter="url(#glow)">
        <animate attributeName="d"
                 values="M -40,0 Q -35,-20 -40,-40 Q -35,-60 -40,-80;
                         M -40,0 Q -45,-20 -40,-40 Q -45,-60 -40,-80;
                         M -40,0 Q -35,-20 -40,-40 Q -35,-60 -40,-80"
                 dur="2s" repeatCount="indefinite"/>
      </path>

      <!-- Right vertical harmonic wave -->
      <path d="M 40,0 Q 35,-20 40,-40 Q 35,-60 40,-80"
            stroke="url(#harmonicGradient)" stroke-width="4" fill="none" filter="url(#glow)">
        <animate attributeName="d"
                 values="M 40,0 Q 35,-20 40,-40 Q 35,-60 40,-80;
                         M 40,0 Q 45,-20 40,-40 Q 45,-60 40,-80;
                         M 40,0 Q 35,-20 40,-40 Q 35,-60 40,-80"
                 dur="2s" repeatCount="indefinite"/>
      </path>

      <!-- Central connecting wave -->
      <path d="M -40,-40 Q 0,-35 40,-40"
            stroke="url(#harmonicGradient)" stroke-width="4" fill="none" filter="url(#glow)">
        <animate attributeName="d"
                 values="M -40,-40 Q 0,-35 40,-40;
                         M -40,-40 Q 0,-45 40,-40;
                         M -40,-40 Q 0,-35 40,-40"
                 dur="1.5s" repeatCount="indefinite"/>
      </path>

      <!-- Radiating sound waves from center -->
      <circle r="60" fill="none" stroke="#1DB954" stroke-width="0.5" opacity="0.3">
        <animate attributeName="r" from="20" to="60" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.6" to="0" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle r="80" fill="none" stroke="#1DB954" stroke-width="0.5" opacity="0.2">
        <animate attributeName="r" from="20" to="80" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="4s" repeatCount="indefinite"/>
      </circle>

      <!-- Central pulse - represents real-time activity -->
      <circle r="8" fill="url(#pulseGradient)" filter="url(#glow)">
        <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite"/>
      </circle>
    </g>

    <!-- Social network visualization - connected listeners -->
    <g opacity="0.4">
      <!-- Left network -->
      <path d="M 50,100 Q 150,80 250,120" stroke="url(#networkGradient)" stroke-width="2" fill="none"/>
      <circle cx="50" cy="100" r="5" fill="#1DB954">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="150" cy="80" r="4" fill="#1ED760">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="0.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="250" cy="120" r="6" fill="#1DB954">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="1s" repeatCount="indefinite"/>
      </circle>

      <!-- Right network -->
      <path d="M 550,120 Q 650,80 750,100" stroke="url(#networkGradient)" stroke-width="2" fill="none"/>
      <circle cx="550" cy="120" r="6" fill="#1DB954">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="650" cy="80" r="4" fill="#1ED760">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="750" cy="100" r="5" fill="#1DB954">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="2.5s" repeatCount="indefinite"/>
      </circle>

      <!-- Bottom network -->
      <circle cx="200" cy="160" r="4" fill="#1ED760">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="0.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="600" cy="160" r="4" fill="#1ED760">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" begin="1.8s" repeatCount="indefinite"/>
      </circle>
    </g>

    <!-- Musical frequency bars - representing real-time listening -->
    <g transform="translate(400, 150)" opacity="0.3">
      <rect x="-60" y="0" width="4" height="20" fill="#FF6B35">
        <animate attributeName="height" values="20;35;20" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-15;0" dur="0.8s" repeatCount="indefinite"/>
      </rect>
      <rect x="-50" y="0" width="4" height="25" fill="#FFD23F">
        <animate attributeName="height" values="25;40;25" dur="0.9s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-15;0" dur="0.9s" repeatCount="indefinite"/>
      </rect>
      <rect x="-40" y="0" width="4" height="30" fill="#1DB954">
        <animate attributeName="height" values="30;50;30" dur="1s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-20;0" dur="1s" repeatCount="indefinite"/>
      </rect>
      <rect x="-30" y="0" width="4" height="35" fill="#1ED760">
        <animate attributeName="height" values="35;55;35" dur="1.1s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-20;0" dur="1.1s" repeatCount="indefinite"/>
      </rect>
      <rect x="26" y="0" width="4" height="35" fill="#1ED760">
        <animate attributeName="height" values="35;55;35" dur="1.1s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-20;0" dur="1.1s" repeatCount="indefinite"/>
      </rect>
      <rect x="36" y="0" width="4" height="30" fill="#1DB954">
        <animate attributeName="height" values="30;50;30" dur="1s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-20;0" dur="1s" repeatCount="indefinite"/>
      </rect>
      <rect x="46" y="0" width="4" height="25" fill="#FFD23F">
        <animate attributeName="height" values="25;40;25" dur="0.9s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-15;0" dur="0.9s" repeatCount="indefinite"/>
      </rect>
      <rect x="56" y="0" width="4" height="20" fill="#FF6B35">
        <animate attributeName="height" values="20;35;20" dur="0.8s" repeatCount="indefinite"/>
        <animate attributeName="y" values="0;-15;0" dur="0.8s" repeatCount="indefinite"/>
      </rect>
    </g>

    <!-- Title -->
    <text x="400" y="210" font-family="Arial, sans-serif" font-size="58" font-weight="300"
          text-anchor="middle" fill="#1DB954" filter="url(#glow)">HARMONIQUE</text>

    <!-- Subtitle -->
    <text x="400" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="300"
          text-anchor="middle" fill="#B3B3B3" opacity="0.8">
      Where Music Lives • Real-Time Social Listening • Spotify Connected
    </text>

    <!-- Decorative elements -->
    <g opacity="0.2">
      <!-- Left decorative wave -->
      <path d="M 50,220 Q 100,210 150,220" stroke="#1DB954" stroke-width="1" fill="none"/>
      <!-- Right decorative wave -->
      <path d="M 650,220 Q 700,210 750,220" stroke="#1DB954" stroke-width="1" fill="none"/>
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