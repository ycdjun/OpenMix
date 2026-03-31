import useStore from '../store'

export default function QueuePanel() {
  const { queue, currentIndex, setCurrentIndex, setPlaying, removeFromQueue, clearQueue, playing, reorderQueue } = useStore()

  const handleTrackClick = (idx) => {
    setCurrentIndex(idx)
    setPlaying(true)
  }

  const move = (from, to) => {
    if (to < 0 || to >= queue.length) return
    reorderQueue(from, to)
  }

  return (
    <aside className="queue-panel">
      <div className="queue-header">
        <span className="queue-title">Mix</span>
        {queue.length > 0 && (
          <span className="queue-count">{queue.length}</span>
        )}
        {queue.length > 0 && (
          <button
            className="icon-btn"
            onClick={clearQueue}
            title="Clear mix"
            style={{ marginLeft: 'auto', opacity: 0.6 }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <div className="queue-list">
        {queue.length === 0 ? (
          <div className="queue-empty">
            <div className="queue-empty-icon">🎛</div>
            <div className="queue-empty-title">Your mix is empty</div>
            <div className="queue-empty-body">
              Search for tracks and hit <strong>+</strong> to add them here. Mix Spotify and SoundCloud freely.
            </div>
          </div>
        ) : (
          queue.map((track, idx) => (
            <QueueTrack
              key={track.id}
              track={track}
              index={idx}
              isActive={idx === currentIndex}
              isPlaying={idx === currentIndex && playing}
              onClick={() => handleTrackClick(idx)}
              onRemove={() => removeFromQueue(track.id)}
              onMoveUp={() => move(idx, idx - 1)}
              onMoveDown={() => move(idx, idx + 1)}
              canMoveUp={idx > 0}
              canMoveDown={idx < queue.length - 1}
            />
          ))
        )}
      </div>

      {queue.length > 0 && (
        <div className="queue-footer">
          <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1 }}>
            {queue.filter(t => t.source === 'spotify').length} Spotify ·{' '}
            {queue.filter(t => t.source === 'soundcloud').length} SoundCloud
          </span>
        </div>
      )}
    </aside>
  )
}

function QueueTrack({ track, index, isActive, isPlaying, onClick, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  return (
    <div className={`queue-track ${isActive ? 'active' : ''}`} onClick={onClick}>
      {/* Index or now-playing bars */}
      <div className="queue-track-num">
        {isPlaying ? (
          <div className="nowplaying-bar" style={{ justifyContent: 'center' }}>
            <span /><span /><span /><span />
          </div>
        ) : (
          index + 1
        )}
      </div>

      {/* Art */}
      <div className="queue-track-art">
        {track.artworkUrl ? (
          <img src={track.artworkUrl} alt={track.title} loading="lazy" />
        ) : (
          track.source === 'soundcloud' ? '🔊' : '🎵'
        )}
      </div>

      {/* Info */}
      <div className="queue-track-info">
        <div className="queue-track-title">{track.title}</div>
        <div className="queue-track-artist">
          <span className={`source-dot ${track.source}`} style={{ display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} />
          {track.artist}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0 }} className="queue-track-controls">
        <button
          style={{ display: canMoveUp ? 'flex' : 'invisible', width: 20, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 3, color: 'var(--text-dim)', fontSize: 10 }}
          onClick={(e) => { e.stopPropagation(); onMoveUp() }}
          disabled={!canMoveUp}
          title="Move up"
        >
          ▲
        </button>
        <button
          style={{ display: canMoveDown ? 'flex' : 'invisible', width: 20, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 3, color: 'var(--text-dim)', fontSize: 10 }}
          onClick={(e) => { e.stopPropagation(); onMoveDown() }}
          disabled={!canMoveDown}
          title="Move down"
        >
          ▼
        </button>
      </div>

      {/* Remove */}
      <button
        className="queue-track-remove"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        title="Remove"
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
