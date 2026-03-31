import { useState, useCallback, useRef } from 'react'
import useStore from '../store'
import { searchSpotify } from '../services/spotify'
import { searchSoundCloud, resolveByUrl } from '../services/soundcloud'
import TrackCard from './TrackCard'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const SC_URL_RE = /^https?:\/\/(www\.)?soundcloud\.com\/.+/i

export default function SearchView() {
  const {
    spotify, config,
    query, setQuery,
    searchResults, setSearchResults,
    searchLoading, setSearchLoading,
    activeSource, setActiveSource,
    addToQueue,
  } = useStore()

  const [scUrlInput, setScUrlInput] = useState('')
  const [scUrlLoading, setScUrlLoading] = useState(false)
  const [scUrlError, setScUrlError] = useState(null)
  const [scUrlTrack, setScUrlTrack] = useState(null)
  const inputRef = useRef(null)

  const runSearch = useCallback(
    debounce(async (q, source, spToken, scKey) => {
      if (!q.trim()) {
        setSearchResults({ spotify: [], soundcloud: [] })
        return
      }

      setSearchLoading(true)

      const tasks = []
      if (spToken && (source === 'all' || source === 'spotify')) {
        tasks.push(
          searchSpotify(q, spToken)
            .then((r) => ({ spotify: r }))
            .catch(() => ({ spotify: [] }))
        )
      }
      if (scKey && (source === 'all' || source === 'soundcloud')) {
        tasks.push(
          searchSoundCloud(q, scKey)
            .then((r) => ({ soundcloud: r }))
            .catch(() => ({ soundcloud: [] }))
        )
      }

      const results = await Promise.all(tasks)
      const merged = results.reduce((acc, r) => ({ ...acc, ...r }), { spotify: [], soundcloud: [] })
      setSearchResults(merged)
      setSearchLoading(false)
    }, 350),
    []
  )

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    runSearch(val, activeSource, spotify.accessToken, config.soundcloudClientId)
  }

  const handleSourceChange = (src) => {
    setActiveSource(src)
    runSearch(query, src, spotify.accessToken, config.soundcloudClientId)
  }

  const handleScUrlResolve = async () => {
    if (!scUrlInput.trim()) return
    setScUrlLoading(true)
    setScUrlError(null)
    setScUrlTrack(null)
    try {
      const track = await resolveByUrl(scUrlInput.trim())
      setScUrlTrack(track)
    } catch {
      setScUrlError('Could not resolve that URL. Make sure it\'s a public SoundCloud track link.')
    } finally {
      setScUrlLoading(false)
    }
  }

  const handleScUrlAdd = () => {
    if (!scUrlTrack) return
    addToQueue(scUrlTrack)
    setScUrlTrack(null)
    setScUrlInput('')
  }

  const hasSpotify = !!spotify.accessToken
  const hasSoundCloud = !!config.soundcloudClientId
  const hasSearchSources = hasSpotify || hasSoundCloud

  const spotifyTracks = searchResults.spotify || []
  const soundcloudTracks = searchResults.soundcloud || []
  const showSpotify = activeSource === 'all' || activeSource === 'spotify'
  const showSoundCloud = activeSource === 'all' || activeSource === 'soundcloud'
  const hasResults = spotifyTracks.length > 0 || soundcloudTracks.length > 0

  return (
    <div className="search-view">
      <div className="search-header">
        <div className="search-bar-wrap">
          <svg className="search-bar-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            className="search-bar"
            type="text"
            placeholder={hasSearchSources ? 'Search tracks, artists, albums…' : 'Connect Spotify or add a SoundCloud API key to search…'}
            value={query}
            onChange={handleQueryChange}
            disabled={!hasSearchSources}
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSearchResults({ spotify: [], soundcloud: [] }); inputRef.current?.focus() }}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', display: 'flex' }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="source-tabs">
          <button className={`source-tab ${activeSource === 'all' ? 'active' : ''}`} onClick={() => handleSourceChange('all')}>
            All Sources
          </button>
          <button
            className={`source-tab ${activeSource === 'spotify' ? 'active' : ''}`}
            onClick={() => handleSourceChange('spotify')}
            disabled={!hasSpotify}
            style={!hasSpotify ? { opacity: 0.4 } : {}}
          >
            <span className="source-tab-dot spotify" />Spotify
          </button>
          <button
            className={`source-tab ${activeSource === 'soundcloud' ? 'active green' : ''}`}
            onClick={() => handleSourceChange('soundcloud')}
            disabled={!hasSoundCloud}
            style={!hasSoundCloud ? { opacity: 0.4 } : {}}
          >
            <span className="source-tab-dot soundcloud" />SoundCloud
          </button>
        </div>
      </div>

      <div className="search-results">
        {/* SoundCloud URL adder — always visible when no SC client_id */}
        {!hasSoundCloud && (
          <div style={{ marginBottom: 24 }}>
            <div className="results-section-header" style={{ marginBottom: 10 }}>
              <span className="results-section-label">SoundCloud</span>
              <span className="results-source-badge soundcloud">Add by URL</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1, fontSize: 13 }}
                type="text"
                placeholder="Paste a SoundCloud track URL…"
                value={scUrlInput}
                onChange={(e) => { setScUrlInput(e.target.value); setScUrlError(null); setScUrlTrack(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleScUrlResolve()}
              />
              <button
                className="btn btn-ghost"
                onClick={handleScUrlResolve}
                disabled={scUrlLoading || !scUrlInput.trim()}
              >
                {scUrlLoading ? <div className="loading-spinner" /> : 'Resolve'}
              </button>
            </div>
            {scUrlError && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{scUrlError}</div>
            )}
            {scUrlTrack && (
              <div style={{ marginTop: 10 }}>
                <TrackCard track={scUrlTrack} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingLeft: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleScUrlAdd}>
                    Add to Mix
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setScUrlTrack(null)}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
              For full SoundCloud search, add a Client ID in Settings.
            </div>
          </div>
        )}

        {!hasSearchSources && !hasSoundCloud && (
          <div className="empty-state" style={{ paddingTop: 16 }}>
            <div className="empty-state-icon">🔌</div>
            <div className="empty-state-title">Connect Spotify to search</div>
            <div className="empty-state-body">SoundCloud tracks can be added by URL above without an API key.</div>
          </div>
        )}

        {hasSearchSources && !query && (
          <div className="empty-state" style={{ paddingTop: hasSoundCloud ? 48 : 16 }}>
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">Search your music</div>
            <div className="empty-state-body">
              Find tracks from {[hasSpotify && 'Spotify', hasSoundCloud && 'SoundCloud'].filter(Boolean).join(' and ')} and add them to your mix.
            </div>
          </div>
        )}

        {searchLoading && (
          <div className="loading-row">
            <div className="loading-spinner" />Searching…
          </div>
        )}

        {!searchLoading && query && !hasResults && (
          <div className="empty-state">
            <div className="empty-state-icon">🎵</div>
            <div className="empty-state-title">No results found</div>
            <div className="empty-state-body">Try a different search term.</div>
          </div>
        )}

        {!searchLoading && hasResults && (
          <>
            {showSpotify && spotifyTracks.length > 0 && (
              <div className="results-section">
                <div className="results-section-header">
                  <span className="results-section-label">Spotify</span>
                  <span className="results-source-badge spotify">{spotifyTracks.length} tracks</span>
                </div>
                <div className="track-list">
                  {spotifyTracks.map((t) => <TrackCard key={t.id} track={t} />)}
                </div>
              </div>
            )}
            {showSoundCloud && soundcloudTracks.length > 0 && (
              <div className="results-section">
                <div className="results-section-header">
                  <span className="results-section-label">SoundCloud</span>
                  <span className="results-source-badge soundcloud">{soundcloudTracks.length} tracks</span>
                </div>
                <div className="track-list">
                  {soundcloudTracks.map((t) => <TrackCard key={t.id} track={t} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
