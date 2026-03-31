import { useEffect, useState } from 'react'
import useStore from '../store'
import { initiateSpotifyAuth, getTopTracks, getRecentTracks, getNewReleases } from '../services/spotify'
import TrackCard from './TrackCard'

export default function HomeView() {
  const { spotify, config, setView, setSetupOpen } = useStore()
  const [topTracks, setTopTracks] = useState([])
  const [recentTracks, setRecentTracks] = useState([])
  const [newReleases, setNewReleases] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!spotify.connected || !spotify.accessToken) return

    setLoading(true)
    Promise.all([
      getTopTracks(spotify.accessToken).catch(() => []),
      getRecentTracks(spotify.accessToken).catch(() => []),
      getNewReleases(spotify.accessToken).catch(() => []),
    ]).then(([top, recent, releases]) => {
      setTopTracks(top)
      setRecentTracks(recent.slice(0, 8))
      setNewReleases(releases.slice(0, 8))
    }).finally(() => setLoading(false))
  }, [spotify.connected, spotify.accessToken])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="home-view">
      {/* Greeting */}
      <div className="home-greeting">
        <h1>{greeting}</h1>
        <p>
          {spotify.connected && spotify.user
            ? `Signed in as ${spotify.user.display_name || spotify.user.id}`
            : 'Connect your music sources to get started'}
        </p>
      </div>

      {/* Connect cards */}
      {(!spotify.connected || !config.soundcloudClientId) && (
        <div className="home-connect-cards">
          {!spotify.connected && (
            <div className="connect-card">
              <div className="connect-card-header">
                <div className="connect-card-logo spotify">🎵</div>
                <div>
                  <div className="connect-card-title">Spotify</div>
                  <div className="connect-card-sub">Full tracks · Premium required</div>
                </div>
              </div>
              <div className="connect-card-body">
                Browse your top tracks, recent history, and search the full Spotify catalog. Full track playback requires Spotify Premium.
              </div>
              <button
                className="btn btn-spotify btn-sm"
                onClick={() => {
                  if (!config.spotifyClientId) {
                    setSetupOpen(true)
                  } else {
                    initiateSpotifyAuth(config.spotifyClientId, config.redirectUri)
                  }
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Connect Spotify
              </button>
            </div>
          )}

          {!config.soundcloudClientId && (
            <div className="connect-card">
              <div className="connect-card-header">
                <div className="connect-card-logo soundcloud">🔊</div>
                <div>
                  <div className="connect-card-title">SoundCloud</div>
                  <div className="connect-card-sub">Public tracks & samples</div>
                </div>
              </div>
              <div className="connect-card-body">
                Search SoundCloud's public catalog and mix indie artists, remixes, and samples into your playlist.
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSetupOpen(true)}>
                Add API Key
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connected state content */}
      {spotify.connected && (
        <>
          {loading && (
            <div className="loading-row">
              <div className="loading-spinner" />
              Loading your music…
            </div>
          )}

          {!loading && topTracks.length > 0 && (
            <div className="home-section">
              <div className="home-section-header">
                <span className="home-section-title">Your Top Tracks</span>
                <span className="tag spotify">Spotify</span>
              </div>
              <div className="track-list">
                {topTracks.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            </div>
          )}

          {!loading && recentTracks.length > 0 && (
            <div className="home-section">
              <div className="home-section-header">
                <span className="home-section-title">Recently Played</span>
                <span className="tag spotify">Spotify</span>
              </div>
              <div className="track-list">
                {recentTracks.slice(0, 6).map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            </div>
          )}

          {!loading && newReleases.length > 0 && (
            <div className="home-section">
              <div className="home-section-header">
                <span className="home-section-title">New Releases</span>
                <span className="tag spotify">Spotify</span>
              </div>
              <div className="album-grid">
                {newReleases.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Not connected */}
      {!spotify.connected && (
        <div className="home-section">
          <div className="empty-state">
            <div className="empty-state-icon">🎛</div>
            <div className="empty-state-title">Your unified music workspace</div>
            <div className="empty-state-body">
              Connect Spotify to browse your library. Add a SoundCloud API key to mix in public tracks and samples.
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setSetupOpen(true)}>
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AlbumCard({ album }) {
  const { addToQueue } = useStore()
  const art = album.images?.[0]?.url

  return (
    <div
      className="album-card"
      onClick={() => window.open(album.external_urls?.spotify, '_blank')}
      title={`${album.name} · ${album.artists?.map(a => a.name).join(', ')}`}
    >
      {art ? (
        <img className="album-card-art" src={art} alt={album.name} loading="lazy" />
      ) : (
        <div className="album-card-art-placeholder">💿</div>
      )}
      <div className="album-card-info">
        <div className="album-card-title">{album.name}</div>
        <div className="album-card-artist">{album.artists?.map(a => a.name).join(', ')}</div>
      </div>
    </div>
  )
}
