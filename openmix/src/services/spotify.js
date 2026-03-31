const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_URL = 'https://api.spotify.com/v1'

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function initiateSpotifyAuth(clientId, redirectUri) {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  localStorage.setItem('spotify_code_verifier', verifier)

  // Encode all values needed for token exchange in state — handles cross-origin redirects
  // (e.g. localhost initiates auth, github.io receives callback with no config in localStorage)
  const state = btoa(JSON.stringify({ verifier, clientId, redirectUri }))

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    // Force consent screen so Spotify always re-grants all requested scopes
    // (without this, Spotify silently reuses a cached authorization that may
    // be missing the 'streaming' scope added after first login)
    show_dialog: 'true',
    scope: [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-library-read',
      'user-read-recently-played',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
    ].join(' '),
  })

  window.location.href = `${SPOTIFY_AUTH_URL}?${params}`
}

export async function exchangeCodeForToken(code, clientId, redirectUri) {
  const verifier = localStorage.getItem('spotify_code_verifier')

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error_description || 'Failed to exchange code for token')
  }

  return response.json()
}

export async function refreshSpotifyToken(refreshToken, clientId) {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) throw new Error('Failed to refresh token')
  return response.json()
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(endpoint, token) {
  const response = await fetch(`${SPOTIFY_API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) throw new Error('TOKEN_EXPIRED')
  if (!response.ok) throw new Error(`Spotify API ${response.status}`)
  return response.json()
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCurrentUser(token) {
  return apiFetch('/me', token)
}

export async function searchSpotify(query, token) {
  const params = new URLSearchParams({ q: query, type: 'track', limit: 30, market: 'from_token' })
  const data = await apiFetch(`/search?${params}`, token)
  return (data.tracks?.items || []).map(normalizeSpotifyTrack)
}

export async function getNewReleases(token) {
  const data = await apiFetch('/browse/new-releases?limit=20&country=US', token)
  return data.albums?.items || []
}

export async function getAlbumTracks(albumId, token) {
  const data = await apiFetch(`/albums/${albumId}/tracks?limit=5`, token)
  const album = await apiFetch(`/albums/${albumId}`, token)
  return (data.items || []).map((t) => normalizeSpotifyTrack({ ...t, album }))
}

export async function getTopTracks(token) {
  const data = await apiFetch('/me/top/tracks?limit=20&time_range=short_term', token)
  return (data.items || []).map(normalizeSpotifyTrack)
}

export async function getRecentTracks(token) {
  const data = await apiFetch('/me/player/recently-played?limit=20', token)
  return (data.items || []).map((item) => normalizeSpotifyTrack(item.track))
}

// ── Web Playback SDK ──────────────────────────────────────────────────────────

let sdkLoaded = false
let sdkPromise = null

export function loadSpotifySDK() {
  if (sdkLoaded) return Promise.resolve()
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve) => {
    if (window.Spotify) { sdkLoaded = true; resolve(); return }
    window.onSpotifyWebPlaybackSDKReady = () => { sdkLoaded = true; resolve() }
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    document.head.appendChild(script)
  })

  return sdkPromise
}

// ── Playback control API ──────────────────────────────────────────────────────

// Transfer playback to a specific device without starting it.
// Must be called after the SDK device registers so Spotify recognises it as active.
export async function transferPlayback(token, deviceId) {
  const res = await fetch(`${SPOTIFY_API_URL}/me/player`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  })
  if (!res.ok && res.status !== 204) throw new Error(`Transfer playback failed: ${res.status}`)
}

export async function startPlayback(token, deviceId, uri, positionMs = 0) {
  const res = await fetch(
    `${SPOTIFY_API_URL}/me/player/play?device_id=${deviceId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri], position_ms: positionMs }),
    }
  )
  if (!res.ok && res.status !== 204) throw new Error(`Playback failed: ${res.status}`)
}

// ── Normalizer ────────────────────────────────────────────────────────────────

export function normalizeSpotifyTrack(t) {
  return {
    id: `spotify:${t.id}`,
    source: 'spotify',
    title: t.name,
    artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown',
    album: t.album?.name || '',
    duration: Math.floor((t.duration_ms || 0) / 1000),
    artworkUrl:
      t.album?.images?.[0]?.url ||
      t.images?.[0]?.url ||
      null,
    previewUrl: t.preview_url || null,
    externalUrl: t.external_urls?.spotify || null,
    spotifyId: t.id,
  }
}
