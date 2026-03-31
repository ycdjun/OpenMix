import useStore from '../store'

function formatDuration(seconds) {
  if (!seconds) return '–'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TrackCard({ track, onPlay, showAdd = true, inQueue = false, queueIndex = null }) {
  const { queue, currentIndex, addToQueue, removeFromQueue, setCurrentIndex, setPlaying, playing } = useStore()

  const isInQueue = queue.some((t) => t.id === track.id)
  const trackQueueIdx = queue.findIndex((t) => t.id === track.id)
  const isActive = trackQueueIdx !== -1 && trackQueueIdx === currentIndex
  const isCurrentlyPlaying = isActive && playing

  const handlePlay = () => {
    if (isInQueue) {
      setCurrentIndex(trackQueueIdx)
      setPlaying(true)
    } else {
      addToQueue(track)
      const newIdx = queue.length
      setTimeout(() => {
        setCurrentIndex(newIdx)
        setPlaying(true)
      }, 0)
    }
    onPlay?.()
  }

  const handleAddToQueue = (e) => {
    e.stopPropagation()
    addToQueue(track)
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    removeFromQueue(track.id)
  }

  return (
    <div className={`track-card ${isActive ? 'playing' : ''}`} onClick={handlePlay}>
      {/* Artwork */}
      <div className="track-card-art">
        {track.artworkUrl ? (
          <img src={track.artworkUrl} alt={track.title} loading="lazy" />
        ) : (
          <div className="track-card-art-placeholder">
            {track.source === 'soundcloud' ? '🔊' : '🎵'}
          </div>
        )}
        <div className="track-card-play-overlay">
          {isCurrentlyPlaying ? (
            <NowPlayingBars />
          ) : (
            <PlayIcon />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="track-card-info">
        <div className="track-card-title">{track.title}</div>
        <div className="track-card-meta">
          <span className="track-card-artist">{track.artist}</span>
          {track.album && (
            <>
              <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>·</span>
              <span className="track-card-artist" style={{ flexShrink: 0, maxWidth: 100 }}>{track.album}</span>
            </>
          )}
        </div>
        <div className="track-card-meta" style={{ marginTop: 3 }}>
          <span className="track-card-source">
            <span className={`source-dot ${track.source}`} />
            {track.source === 'spotify' ? 'Spotify' : 'SoundCloud'}
          </span>
        </div>
      </div>

      {/* Duration */}
      <span className="track-card-duration">{formatDuration(track.duration)}</span>

      {/* Actions */}
      <div className="track-card-actions" onClick={(e) => e.stopPropagation()}>
        {inQueue ? (
          <button className="icon-btn" onClick={handleRemove} title="Remove">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        ) : (
          <button
            className={`icon-btn ${isInQueue ? 'active' : ''}`}
            onClick={handleAddToQueue}
            title={isInQueue ? 'In mix' : 'Add to mix'}
          >
            {isInQueue ? (
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            )}
          </button>
        )}

        {track.externalUrl && (
          <a
            href={track.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn"
            title="Open in app"
            onClick={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
          </a>
        )}
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg className="track-card-play-icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  )
}

function NowPlayingBars() {
  return (
    <div className="nowplaying-bar">
      <span /><span /><span /><span />
    </div>
  )
}
