import { useEffect } from 'react'
import useStore from './store'
import { exchangeCodeForToken, getCurrentUser, getTopTracks, getRecentTracks } from './services/spotify'
import Sidebar from './components/Sidebar'
import HomeView from './components/HomeView'
import SearchView from './components/SearchView'
import QueuePanel from './components/QueuePanel'
import Player from './components/Player'
import Setup from './components/Setup'

export default function App() {
  const { config, spotify, setSpotify, view, setupOpen, setSetupOpen } = useStore()

  // Handle Spotify OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      console.error('Spotify auth error:', error)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (code && config.spotifyClientId) {
      // Restore verifier from state param (handles cross-origin redirects)
      const state = params.get('state')
      if (state) {
        try {
          const { verifier } = JSON.parse(atob(state))
          if (verifier) localStorage.setItem('spotify_code_verifier', verifier)
        } catch (_) {}
      }

      window.history.replaceState({}, '', window.location.pathname)

      exchangeCodeForToken(code, config.spotifyClientId, config.redirectUri)
        .then(async (data) => {
          const expiresAt = Date.now() + data.expires_in * 1000
          setSpotify({
            connected: true,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt,
          })
          const user = await getCurrentUser(data.access_token)
          setSpotify({ user })
        })
        .catch((err) => {
          console.error('Token exchange failed:', err)
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On mount, if connected + token present, refresh user info
  useEffect(() => {
    if (spotify.connected && spotify.accessToken && !spotify.user) {
      getCurrentUser(spotify.accessToken)
        .then((user) => setSpotify({ user }))
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Open setup if no credentials on first load
  useEffect(() => {
    if (!config.spotifyClientId && !setupOpen) {
      setSetupOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        {view === 'home' && <HomeView />}
        {view === 'search' && <SearchView />}
      </main>

      <QueuePanel />

      <div className="player-slot">
        <Player />
      </div>

      {setupOpen && <Setup />}
    </div>
  )
}
