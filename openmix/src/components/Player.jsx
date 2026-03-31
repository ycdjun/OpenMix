import { useEffect, useRef, useState, useCallback } from 'react'
import useStore from '../store'
import { getWidgetUrl, loadSCWidgetSDK } from '../services/soundcloud'

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Player() {
  const {
    queue, currentIndex,
    playing, setPlaying,
    volume, setVolume,
    progress, setProgress,
    duration, setDuration,
    playNext, playPrev,
  } = useStore()

  const audioRef = useRef(null)
  const scIframeRef = useRef(null)
  const scWidgetRef = useRef(null)
  const isSeeking = useRef(false)
  const [scReady, setScReady] = useState(false)

  const currentTrack = queue[currentIndex] ?? null
  const isSpotify = currentTrack?.source === 'spotify'
  const isSoundCloud = currentTrack?.source === 'soundcloud'

  // ── Load SoundCloud Widget SDK ──────────────────────────────────────────────
  useEffect(() => {
    loadSCWidgetSDK().catch(() => {})
  }, [])

  // ── Track change ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) {
      setProgress(0)
      setDuration(0)
      return
    }

    if (isSpotify) {
      // Pause SC widget
      scWidgetRef.current?.pause?.()

      const audio = audioRef.current
      if (!audio) return

      if (currentTrack.previewUrl) {
        audio.src = currentTrack.previewUrl
        audio.load()
        if (playing) audio.play().catch(() => setPlaying(false))
      } else {
        // No preview — open in Spotify
        audio.src = ''
        setDuration(currentTrack.duration || 0)
        setProgress(0)
        if (currentTrack.externalUrl) {
          window.open(currentTrack.externalUrl, '_blank')
        }
        setPlaying(false)
      }
    }

    if (isSoundCloud) {
      // Pause HTML audio
      const audio = audioRef.current
      if (audio) { audio.pause(); audio.src = '' }

      // Load SC widget
      if (currentTrack.permalinkUrl && scIframeRef.current) {
        const widgetUrl = getWidgetUrl(currentTrack.permalinkUrl)
        scIframeRef.current.src = widgetUrl
        setScReady(false)
      }
    }
  }, [currentIndex, currentTrack?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play / Pause (Spotify) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isSpotify) return
    const audio = audioRef.current
    if (!audio || !currentTrack?.previewUrl) return

    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing, isSpotify]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play / Pause (SoundCloud) ───────────────────────────────────────────────
  useEffect(() => {
    if (!isSoundCloud || !scReady) return
    if (playing) {
      scWidgetRef.current?.play?.()
    } else {
      scWidgetRef.current?.pause?.()
    }
  }, [playing, isSoundCloud, scReady])

  // ── Volume (Spotify) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // ── SC widget message listener ──────────────────────────────────────────────
  useEffect(() => {
    const iframe = scIframeRef.current
    if (!iframe) return

    const onLoad = () => {
      const SC = window.SC
      if (!SC?.Widget) return

      const widget = SC.Widget(iframe)
      scWidgetRef.current = widget

      widget.bind(SC.Widget.Events.READY, () => {
        setScReady(true)
        widget.setVolume(volume * 100)
        if (playing) widget.play()
      })

      widget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
        if (!isSeeking.current) {
          setProgress(e.currentPosition / 1000)
          if (e.relativePosition > 0) {
            setDuration(Math.round(e.currentPosition / 1000 / e.relativePosition))
          }
        }
      })

      widget.bind(SC.Widget.Events.FINISH, () => {
        playNext()
      })
    }

    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SC volume ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scReady && scWidgetRef.current) {
      scWidgetRef.current.setVolume?.(volume * 100)
    }
  }, [volume, scReady])

  // ── HTML Audio event handlers ───────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (isSeeking.current) return
    const audio = audioRef.current
    if (audio) setProgress(audio.currentTime)
  }, [setProgress])

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration)
  }, [setDuration])

  const handleEnded = useCallback(() => {
    playNext()
  }, [playNext])

  const handleAudioPlay = useCallback(() => setPlaying(true), [setPlaying])
  const handleAudioPause = useCallback(() => {}, [])

  // ── Progress bar seek ───────────────────────────────────────────────────────
  const handleProgressClick = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const newTime = ratio * duration

    if (isSpotify && audioRef.current) {
      audioRef.current.currentTime = newTime
      setProgress(newTime)
    } else if (isSoundCloud && scWidgetRef.current) {
      scWidgetRef.current.seekTo?.(newTime * 1000)
      setProgress(newTime)
    }
  }

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <>
      {/* Hidden HTML audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        style={{ display: 'none' }}
      />

      {/* Hidden SC widget iframe */}
      <iframe
        ref={scIframeRef}
        id="sc-widget"
        title="SoundCloud Player"
        allow="autoplay"
        style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}
      />

      <div className="player">
        {/* Track info */}
        <div className="player-track">
          {currentTrack ? (
            <>
              <div className="player-art">
                {currentTrack.artworkUrl ? (
                  <img src={currentTrack.artworkUrl} alt={currentTrack.title} />
                ) : (
                  currentTrack.source === 'soundcloud' ? '🔊' : '🎵'
                )}
              </div>
              <div className="player-track-info">
                <div className="player-track-title">{currentTrack.title}</div>
                <div className="player-track-artist">{currentTrack.artist}</div>
                <div className="player-track-source">
                  <span className={`source-dot ${currentTrack.source}`} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                    {currentTrack.source === 'spotify' ? 'Spotify' : 'SoundCloud'}
                    {isSpotify && !currentTrack.previewUrl && ' · no preview'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Nothing playing</div>
          )}
        </div>

        {/* Controls + Progress */}
        <div className="player-controls">
          <div className="player-buttons">
            <button className="player-btn" onClick={playPrev} disabled={currentIndex <= 0} style={currentIndex <= 0 ? { opacity: 0.3 } : {}}>
              <PrevIcon />
            </button>

            <button
              className="player-btn-play"
              onClick={() => {
                if (!currentTrack && queue.length > 0) {
                  useStore.getState().setCurrentIndex(0)
                  setPlaying(true)
                } else {
                  setPlaying(!playing)
                }
              }}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              className="player-btn"
              onClick={playNext}
              disabled={currentIndex >= queue.length - 1}
              style={currentIndex >= queue.length - 1 ? { opacity: 0.3 } : {}}
            >
              <NextIcon />
            </button>
          </div>

          <div className="player-progress">
            <span className="player-time">{formatTime(progress)}</span>
            <div className="progress-bar" onClick={handleProgressClick}>
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="player-time">{formatTime(duration || currentTrack?.duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="player-right">
          <div className="volume-control">
            <svg className="volume-icon" viewBox="0 0 20 20" fill="currentColor">
              {volume === 0 ? (
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : volume < 0.5 ? (
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.146 5.146a.5.5 0 01.708 0A6.97 6.97 0 0115 10a6.97 6.97 0 01-2.146 4.854.5.5 0 11-.708-.708A5.97 5.97 0 0014 10a5.97 5.97 0 00-1.854-4.146.5.5 0 010-.708z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              )}
            </svg>
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function PrevIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
    </svg>
  )
}
