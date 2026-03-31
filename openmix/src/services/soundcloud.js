const SC_API = 'https://api.soundcloud.com'

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchSoundCloud(query, clientId, limit = 30) {
  const params = new URLSearchParams({
    q: query,
    client_id: clientId,
    limit,
    linked_partitioning: 1,
  })

  const response = await fetch(`${SC_API}/tracks?${params}`)
  if (!response.ok) throw new Error(`SoundCloud API ${response.status}`)
  const data = await response.json()
  const items = Array.isArray(data) ? data : data.collection || []
  return items.filter((t) => t.streamable || t.permalink_url).map(normalizeSoundCloudTrack)
}

// ── Normalizer ────────────────────────────────────────────────────────────────

export function normalizeSoundCloudTrack(t) {
  return {
    id: `soundcloud:${t.id}`,
    source: 'soundcloud',
    title: t.title || 'Unknown',
    artist: t.user?.username || 'Unknown',
    album: '',
    duration: Math.floor((t.duration || 0) / 1000),
    artworkUrl: (t.artwork_url || t.user?.avatar_url || null)?.replace('-large', '-t300x300'),
    previewUrl: null,
    permalinkUrl: t.permalink_url,
    streamUrl: t.stream_url ? `${t.stream_url}?client_id=${t._clientId}` : null,
    soundcloudId: t.id,
    externalUrl: t.permalink_url,
    _clientId: t._clientId,
  }
}

// ── Widget URL ────────────────────────────────────────────────────────────────

export function getWidgetUrl(trackUrl) {
  return (
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}` +
    `&auto_play=true&hide_related=true&show_comments=false` +
    `&show_user=false&show_reposts=false&visual=false&buying=false&sharing=false`
  )
}

// ── Load SC Widget SDK ────────────────────────────────────────────────────────

let sdkLoaded = false
let sdkPromise = null

export function loadSCWidgetSDK() {
  if (sdkLoaded) return Promise.resolve()
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://w.soundcloud.com/player/api.js'
    script.onload = () => {
      sdkLoaded = true
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })

  return sdkPromise
}
