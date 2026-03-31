import useStore from '../store'
import { initiateSpotifyAuth } from '../services/spotify'

export default function Sidebar() {
  const { spotify, config, disconnectSpotify, view, setView, setSetupOpen } = useStore()

  const handleSpotifyConnect = () => {
    if (!config.spotifyClientId) {
      setSetupOpen(true)
      return
    }
    initiateSpotifyAuth(config.spotifyClientId, config.redirectUri)
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎛</div>
        <span className="sidebar-logo-name">OpenMix</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          <svg className="nav-item-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          Home
        </button>

        <button
          className={`nav-item ${view === 'search' ? 'active' : ''}`}
          onClick={() => setView('search')}
        >
          <svg className="nav-item-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          Search
        </button>
      </nav>

      {/* Connections */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Sources</div>

        {/* Spotify */}
        {spotify.connected ? (
          <button className="connect-btn" onClick={disconnectSpotify}>
            <span className="connect-btn-dot spotify connected" style={{ color: '#1db954' }} />
            <span className="connect-btn-label">Spotify</span>
            {spotify.user && (
              <span className="connect-btn-status" style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {spotify.user.display_name || spotify.user.id}
              </span>
            )}
          </button>
        ) : (
          <button className="connect-btn" onClick={handleSpotifyConnect}>
            <span className="connect-btn-dot spotify disconnected" />
            <span className="connect-btn-label">Spotify</span>
            <span className="connect-btn-status">Connect</span>
          </button>
        )}

        {/* SoundCloud */}
        <button className="connect-btn" style={{ cursor: 'default' }}>
          <span
            className={`connect-btn-dot soundcloud ${config.soundcloudClientId ? 'connected' : 'disconnected'}`}
            style={{ color: '#ff5500' }}
          />
          <span className="connect-btn-label">SoundCloud</span>
          <span className="connect-btn-status">
            {config.soundcloudClientId ? 'Active' : 'No key'}
          </span>
        </button>
      </div>

      {/* Settings */}
      <div style={{ padding: '0 10px 12px' }}>
        <button className="sidebar-settings-btn" onClick={() => setSetupOpen(true)}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  )
}
