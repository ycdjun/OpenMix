import { useState } from 'react'
import useStore from '../store'

export default function Setup() {
  const { config, setConfig, setSetupOpen, spotify, disconnectSpotify } = useStore()

  const [spotifyClientId, setSpotifyClientId] = useState(config.spotifyClientId)
  const [soundcloudClientId, setSoundcloudClientId] = useState(config.soundcloudClientId)
  const [redirectUri, setRedirectUri] = useState(config.redirectUri || window.location.origin)

  const handleSave = () => {
    setConfig({ spotifyClientId, soundcloudClientId, redirectUri })
    setSetupOpen(false)
  }

  const handleClose = () => setSetupOpen(false)

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Settings</div>
            <div className="modal-sub">Connect your music sources to unlock search and playback.</div>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="modal-body">

          {/* ── Spotify ─────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 22 }}>🎵</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Spotify</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>OAuth PKCE — no server needed</div>
            </div>
            {spotify.connected && (
              <span className="tag spotify" style={{ marginLeft: 'auto' }}>Connected</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Client ID
              <span className="form-label-badge">Required</span>
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. abc123def456..."
              value={spotifyClientId}
              onChange={(e) => setSpotifyClientId(e.target.value)}
            />
            <span className="form-hint">
              Create an app at{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">
                developer.spotify.com/dashboard
              </a>
              . Set "Redirect URI" to the value below.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Redirect URI</label>
            <input
              className="form-input"
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
            />
            <span className="form-hint">
              Must exactly match a redirect URI in your Spotify app settings.
            </span>
          </div>

          <div className="redirect-info">
            <div className="redirect-info-label">Your current origin</div>
            <div className="redirect-info-value">{window.location.origin}</div>
          </div>

          {spotify.connected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)' }}>
                Signed in as <strong style={{ color: 'var(--text)' }}>{spotify.user?.display_name || spotify.user?.id || '…'}</strong>
              </div>
              <button className="btn btn-danger btn-sm" onClick={disconnectSpotify}>
                Disconnect
              </button>
            </div>
          )}

          <div className="modal-divider" />

          {/* ── SoundCloud ───────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 22 }}>🔊</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>SoundCloud</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Public tracks & samples</div>
            </div>
            {config.soundcloudClientId && (
              <span className="tag soundcloud" style={{ marginLeft: 'auto' }}>Active</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Client ID
              <span className="form-label-badge optional">Optional</span>
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="SoundCloud API client_id"
              value={soundcloudClientId}
              onChange={(e) => setSoundcloudClientId(e.target.value)}
            />
            <span className="form-hint">
              Register at{' '}
              <a href="https://developers.soundcloud.com" target="_blank" rel="noopener noreferrer">
                developers.soundcloud.com
              </a>
              . Without a key, you can still play any SoundCloud track by adding it via URL. Search is enabled when a key is present.
            </span>
          </div>

          <div className="modal-divider" />

          {/* ── Playback note ────────────────────────────── */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)' }}>Playback note:</strong> Spotify tracks play as 30-second previews (no Premium required). SoundCloud tracks play via the embeddable widget. To listen to full Spotify tracks, open them in the Spotify app via the external link.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}
