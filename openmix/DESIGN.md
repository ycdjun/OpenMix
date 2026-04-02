# OpenMix — Design & Requirements

## What It Is

A unified music workspace that lets users search, queue, and save playlists mixing tracks from **Spotify**, **YouTube**, and **SoundCloud** — accessible from any device after a single Spotify login.

---

## User Stories

1. Search songs across Spotify, YouTube, and SoundCloud in one place
2. Add/remove songs from playlists
3. Create and delete playlists
4. Share a playlist via a link (read-only for recipients)
5. Log in once with Spotify — playlists sync across all devices
6. Play full tracks (Spotify Premium), YouTube videos, and SoundCloud embeds

---

## Tech Stack

### Frontend
| Concern | Choice |
|---|---|
| Framework | React 18 + Vite |
| State | Zustand (persist to localStorage) |
| Hosting | GitHub Pages |
| Spotify playback | Web Playback SDK (Premium required) |
| YouTube playback | IFrame Player API (player must be visible ≥200×200px) |
| SoundCloud playback | Widget iframe (hidden ok) |

### Backend
| Concern | Choice |
|---|---|
| Runtime | Cloudflare Workers (Hono router) |
| Database | Cloudflare KV |
| Language | TypeScript |
| Deployment | Wrangler + GitHub Actions |

---

## Architecture

```
Browser / Mobile App
│
├── Spotify PKCE OAuth ──────────────────────► Spotify Accounts
│   client_id in env var (not secret)
│
├── All API calls with Bearer token ─────────► Cloudflare Worker
│                                               │
│   - search (all three sources)                ├── Spotify search proxy
│   - playlist CRUD                             ├── YouTube search proxy  (hides API key)
│   - share links                               ├── SoundCloud search proxy (hides client_id)
│                                               ├── Playlist CRUD
│                                               └── Share token endpoints
│                                                           │
│                                                    Cloudflare KV
│
├── Spotify playback ────────────────────────► Web Playback SDK (direct, no proxy)
├── YouTube playback ────────────────────────► IFrame Player API (direct embed)
└── SoundCloud playback ─────────────────────► Widget iframe (direct embed)
```

---

## Auth

**Single sign-on via Spotify only.** No separate username/password.

### Flow
1. User clicks "Login with Spotify"
2. PKCE OAuth redirect — no client secret needed
3. Spotify returns access token + refresh token → stored in localStorage
4. Every backend request sends `Authorization: Bearer <access_token>`
5. Worker verifies token by calling `GET https://api.spotify.com/v1/me`
6. Result is cached in KV for 5 minutes (keyed by `sha256(token)`) to avoid hammering Spotify
7. When token expires (1 hour), frontend refreshes it silently using the refresh token

**No JWTs, no separate auth service.** The Spotify token is the credential.

---

## Music Sources

### Spotify
- **Search:** Spotify Web API (`/v1/search`) using the user's own access token
- **Playback:** Web Playback SDK — creates a browser device, plays full tracks
- **Requires:** Spotify Premium for playback
- **Client ID:** Hardcoded as `VITE_SPOTIFY_CLIENT_ID` build env var — not a secret in PKCE

### YouTube
- **Search:** YouTube Data API v3, filtered to `videoCategoryId=10` (Music)
- **Playback:** YouTube IFrame Player API
- **Constraint:** Player iframe must be visible and ≥200×200px per YouTube ToS
- **UI:** Show the YouTube player when a YouTube track is active
- **API key:** Server-side only (`YOUTUBE_API_KEY` Wrangler secret)

### SoundCloud
- **Search:** SoundCloud API proxied through the Worker
- **Playback:** SoundCloud Widget iframe (official embed, hidden is fine)
- **URL resolve:** `soundcloud.com/oembed` for pasting direct track URLs (no API key needed)
- **ToS note:** Mixing SC content with other sources is a grey area in SC's ToS. This app is non-commercial. For commercial use, apply for explicit SoundCloud approval.
- **Client ID:** Server-side only (`SC_CLIENT_ID` Wrangler secret)

---

## Backend API

Base URL: `https://api.openmix.app`

All protected routes require: `Authorization: Bearer <spotify_access_token>`

### Search (no auth required)
```
GET /api/search/spotify?q=&limit=     → Spotify search proxy
GET /api/search/youtube?q=&limit=     → YouTube Data API proxy
GET /api/search/soundcloud?q=&limit=  → SoundCloud API proxy
```

### Identity
```
GET /api/me    → verify token, return { spotifyId, displayName, avatar }
```

### Playlists (auth required)
```
GET    /api/playlists           → list all playlists for the user
POST   /api/playlists           → create a new playlist  { name }
GET    /api/playlists/:id       → get a single playlist (with tracks)
PUT    /api/playlists/:id       → full update  { name, tracks[] }
DELETE /api/playlists/:id       → delete
```

### Sharing
```
GET    /api/playlists/:id/share  → get or generate a share token
DELETE /api/playlists/:id/share  → revoke share token
GET    /api/shared/:token        → public read-only playlist (no auth)
```

---

## Data Models

### Playlist
```json
{
  "id": "pl_abc123",
  "ownerId": "spotify_user_id",
  "name": "Friday Vibes",
  "createdAt": 1712000000,
  "updatedAt": 1712001000,
  "tracks": [ ...Track ]
}
```

### Track
```json
{
  "id": "spotify:4iV5W9uYEdYUVa79Axb7Rh",
  "source": "spotify" | "youtube" | "soundcloud",
  "title": "Track Name",
  "artist": "Artist Name",
  "album": "Album Name",
  "duration": 212,
  "artworkUrl": "https://...",

  "spotifyId": "4iV5W9uYEdYUVa79Axb7Rh",        // Spotify only
  "youtubeId": "dQw4w9WgXcQ",                     // YouTube only
  "soundcloudId": 123456789,                       // SoundCloud only
  "permalinkUrl": "https://soundcloud.com/..."     // SoundCloud only
}
```

---

## KV Schema

| Key | Value | TTL |
|---|---|---|
| `token:<sha256>` | `{ spotifyId, displayName }` | 5 min |
| `user:<spotifyId>:playlists` | `["pl_abc", "pl_def"]` | none |
| `playlist:<id>` | Full playlist JSON | none |
| `share:<token>` | `{ playlistId }` | none |
| `playlist:<id>:shareToken` | `"tok_xyz"` | none |

Max KV value size is 25MB. A playlist with 500 tracks is ~150KB — well within limits.

---

## Frontend Structure

```
src/
  components/
    Sidebar.jsx         Navigation + login status
    HomeView.jsx        Landing, top tracks, recent
    SearchView.jsx      Search bar + results for all 3 sources
    QueuePanel.jsx      Current queue / active playlist
    Player.jsx          Unified playback bar + YouTube visible player
    PlaylistView.jsx    [new] List playlists, create, delete, share
    Setup.jsx           [simplified] Only shown if no Spotify client_id env var
  services/
    spotify.js          PKCE auth, SDK, search, playback
    youtube.js          IFrame API loader, normalizeYouTubeTrack
    soundcloud.js       Widget loader, oEmbed resolver
    api.js              [new] All Worker calls, auto-attaches Bearer token
  store/
    index.js            Zustand store (see below)
```

### Zustand Store Slices

```
config          { spotifyClientId, redirectUri, apiBaseUrl }
spotify         { connected, accessToken, refreshToken, expiresAt, user }
backendUser     { spotifyId, displayName }          ← not persisted
playlists       [ ...Playlist ]                     ← not persisted, loaded from API
activePlaylistId                                    ← not persisted
queue           [ ...Track ]                        ← persisted locally
currentIndex    number
playing / volume / progress / duration
needsReauth     boolean
spotifyDeviceId string | null
view / setupOpen / queueOpen
```

**Persisted to localStorage:** `config`, `spotify`, `queue`, `volume`, `queueOpen`

**Not persisted (always fetch fresh):** `playlists`, `backendUser` — this is what enables cross-device sync

---

## Player Architecture

Three players run in parallel, only one active at a time:

```
Spotify  → spotifyPlayerRef   (Web Playback SDK, no DOM element)
YouTube  → ytPlayerRef        (YT.Player, visible iframe ≥200×200)
SoundCloud → scWidgetRef      (SC.Widget, hidden iframe)
```

Active source is determined by `currentTrack.source`.

When a Spotify track is active: pause YT + SC, use SDK
When a YouTube track is active: pause Spotify + SC, show YT player
When a SoundCloud track is active: pause Spotify + YT, use SC widget

---

## Sharing

1. User clicks "Share" on a playlist
2. Frontend calls `GET /api/playlists/:id/share`
3. Worker generates a random token, stores `share:<token> → { playlistId }` in KV
4. Returns `{ url: "https://ycdjun.github.io/OpenMix/shared/tok_xyz" }`
5. Anyone with the URL hits `GET /api/shared/tok_xyz` — no auth, read-only
6. Frontend renders a read-only playlist view at `/shared/:token`

---

## Mobile (Future)

The backend API is already mobile-ready — it only uses the `Authorization` header, no cookies.

Frontend changes needed for React Native:
- Replace `localStorage` → `@react-native-async-storage/async-storage`
- Replace browser PKCE redirect → `expo-auth-session`
- Replace YouTube IFrame → `react-native-youtube-iframe`
- Replace SC Widget → WebView
- Everything else (Zustand, API calls, track normalization) is identical

---

## Environment Variables

### Frontend (Vite)
```
VITE_SPOTIFY_CLIENT_ID=your_spotify_app_client_id
VITE_API_BASE_URL=https://api.openmix.app
```

### Backend (Wrangler secrets — never in code)
```
YOUTUBE_API_KEY=your_google_api_key
SC_CLIENT_ID=your_soundcloud_app_client_id
```

---

## Deployment

```
main branch push
    │
    ├── GitHub Actions: build React → deploy to GitHub Pages
    └── GitHub Actions: wrangler deploy → Cloudflare Workers
```

Secrets stored in GitHub Actions:
- `CF_API_TOKEN` — Cloudflare deploy token
- Frontend env vars as `VITE_*` in repository secrets

---

## Implementation Order

1. **Cloudflare Worker** — scaffold with Wrangler + Hono, all search routes, playlist CRUD, share endpoints
2. **Remove setup screen** — hardcode Spotify client_id, wire SearchView to Worker
3. **YouTube integration** — IFrame API, normalizer, Player.jsx updates
4. **SoundCloud search** — move to Worker proxy
5. **Playlist UI** — PlaylistView component, save/load/share against the API
6. **Sharing UI** — public read-only playlist page at `/shared/:token`
7. **Polish** — React Native prep, error states, loading skeletons
