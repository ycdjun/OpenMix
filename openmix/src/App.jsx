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

    // Extract everything we need from the state param — clientId and redirectUri are
    // encoded there so the exchange works even when this page has empty localStorage
    // (e.g. auth initiated on localhost, callback lands on github.io)
    let effectiveClientId = config.spotifyClientId
    let effectiveRedirectUri = config.redirectUri
    const stateParam = params.get('state')
    if (stateParam) {
      try {
        const stateData = JSON.parse(atob(stateParam))
        if (stateData.verifier) localStorage.setItem('spotify_code_verifier', stateData.verifier)
        if (stateData.clientId) effectiveClientId = stateData.clientId
        if (stateData.redirectUri) effectiveRedirectUri = stateData.redirectUri
        // Persist config so this origin can make API calls after exchange
        if (!config.spotifyClientId && stateData.clientId) {
          useStore.getState().setConfig({ spotifyClientId: stateData.clientId, redirectUri: stateData.redirectUri })
        }
      } catch (_) {}
    }

    if (code && effectiveClientId) {
      window.history.replaceState({}, '', window.location.pathname)

      exchangeCodeForToken(code, effectiveClientId, effectiveRedirectUri)
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
