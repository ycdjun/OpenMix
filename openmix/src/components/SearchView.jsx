import { useState, useCallback, useRef } from 'react'
import useStore from '../store'
import { searchSpotify } from '../services/spotify'
import { searchSoundCloud } from '../services/soundcloud'
import TrackCard from './TrackCard'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function SearchView() {
  const {
    spotify, config,
    query, setQuery,
    searchResults, setSearchResults,
    searchLoading, setSearchLoading,
    activeSource, setActiveSource,
  } = useStore()

  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const runSearch = useCallback(
    debounce(async (q, source, spToken, scKey) => {
      if (!q.trim()) {
        setSearchResults({ spotify: [], soundcloud: [] })
        return
      }

      setSearchLoading(true)
      setError(null)

      const tasks = []
      const doSpotify = spToken && (source === 'all' || source === 'spotify')
      const doSoundCloud = scKey && (source === 'all' || source === 'soundcloud')

      if (doSpotify) {
        tasks.push(
          searchSpotify(q, spToken)
            .then((r) => ({ spotify: r }))
            .catch(() => ({ spotify: [] }))
        )
      }

      if (doSoundCloud) {
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

  const hasSpotify = !!spotify.accessToken
  const hasSoundCloud = !!config.soundcloudClientId
  const hasAny = hasSpotify || hasSoundCloud

  const spotifyTracks = searchResults.spotify || []
  const soundcloudTracks = searchResults.soundcloud || []

  const showSpotify = activeSource === 'all' || activeSource === 'spotify'
  const showSoundCloud = activeSource === 'all' || activeSource === 'soundcloud'
  const hasResults = spotifyTracks.length > 0 || soundcloudTracks.length > 0

  return (
    <div className="search-view">
      {/* Header */}
      <div className="search-header">
        <div className="search-bar-wrap">
          <svg className="search-bar-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            className="search-bar"
            type="text"
            placeholder={
              !hasAny
                ? 'Connect a source in Settings to search…'
                : 'Search tracks, artists, albums…'
            }
            value={query}
            onChange={handleQueryChange}
            disabled={!hasAny}
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

        {/* Source tabs */}
        <div className="source-tabs">
          <button
            className={`source-tab ${activeSource === 'all' ? 'active' : ''}`}
            onClick={() => handleSourceChange('all')}
          >
            All Sources
          </button>
          <button
            className={`source-tab ${activeSource === 'spotify' ? 'active' : ''}`}
            onClick={() => handleSourceChange('spotify')}
            disabled={!hasSpotify}
            style={!hasSpotify ? { opacity: 0.4 } : {}}
          >
            <span className="source-tab-dot spotify" />
            Spotify
          </button>
          <button
            className={`source-tab ${activeSource === 'soundcloud' ? 'active green' : ''}`}
            onClick={() => handleSourceChange('soundcloud')}
            disabled={!hasSoundCloud}
            style={!hasSoundCloud ? { opacity: 0.4 } : {}}
          >
            <span className="source-tab-dot soundcloud" />
            SoundCloud
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="search-results">
        {!hasAny && (
          <div className="empty-state">
            <div className="empty-state-icon">🔌</div>
            <div className="empty-state-title">No sources connected</div>
            <div className="empty-state-body">
              Connect Spotify or add a SoundCloud API key in Settings to start searching.
            </div>
          </div>
        )}

        {hasAny && !query && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">Search your music</div>
            <div className="empty-state-body">
              Find tracks from {[hasSpotify && 'Spotify', hasSoundCloud && 'SoundCloud'].filter(Boolean).join(' and ')} and add them to your mix.
            </div>
          </div>
        )}

        {searchLoading && (
          <div className="loading-row">
            <div className="loading-spinner" />
            Searching…
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
                  {spotifyTracks.map((track) => (
                    <TrackCard key={track.id} track={track} />
                  ))}
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
                  {soundcloudTracks.map((track) => (
                    <TrackCard key={track.id} track={track} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
