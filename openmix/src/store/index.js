import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      // ── Config ──────────────────────────────────────────────────────
      config: {
        spotifyClientId: '',
        soundcloudClientId: '',
        redirectUri: typeof window !== 'undefined'
          ? `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
          : 'http://localhost:5173',
      },
      setConfig: (config) =>
        set((s) => ({ config: { ...s.config, ...config } })),

      // ── Spotify auth ─────────────────────────────────────────────────
      spotify: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        user: null,
      },
      setSpotify: (data) =>
        set((s) => ({ spotify: { ...s.spotify, ...data } })),
      disconnectSpotify: () =>
        set({
          spotify: {
            connected: false,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            user: null,
          },
        }),

      // ── Search ────────────────────────────────────────────────────────
      query: '',
      searchResults: { spotify: [], soundcloud: [] },
      searchLoading: false,
      activeSource: 'all',
      setQuery: (query) => set({ query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setSearchLoading: (loading) => set({ searchLoading: loading }),
      setActiveSource: (source) => set({ activeSource: source }),

      // ── Queue / Mix ───────────────────────────────────────────────────
      queue: [],
      currentIndex: -1,
      addToQueue: (track) => {
        const { queue } = get()
        if (queue.find((t) => t.id === track.id)) return
        set({ queue: [...queue, track] })
      },
      removeFromQueue: (id) =>
        set((s) => {
          const idx = s.queue.findIndex((t) => t.id === id)
          const queue = s.queue.filter((t) => t.id !== id)
          let currentIndex = s.currentIndex
          if (idx < currentIndex) currentIndex -= 1
          else if (idx === currentIndex) currentIndex = Math.min(currentIndex, queue.length - 1)
          return { queue, currentIndex }
        }),
      clearQueue: () => set({ queue: [], currentIndex: -1 }),
      setCurrentIndex: (index) => set({ currentIndex: index }),
      reorderQueue: (from, to) =>
        set((s) => {
          const queue = [...s.queue]
          const [moved] = queue.splice(from, 1)
          queue.splice(to, 0, moved)
          let currentIndex = s.currentIndex
          if (s.currentIndex === from) currentIndex = to
          else if (from < s.currentIndex && to >= s.currentIndex) currentIndex -= 1
          else if (from > s.currentIndex && to <= s.currentIndex) currentIndex += 1
          return { queue, currentIndex }
        }),
      playNext: () =>
        set((s) => ({
          currentIndex:
            s.currentIndex < s.queue.length - 1 ? s.currentIndex + 1 : s.currentIndex,
          playing: s.currentIndex < s.queue.length - 1,
        })),
      playPrev: () =>
        set((s) => ({
          currentIndex: s.currentIndex > 0 ? s.currentIndex - 1 : s.currentIndex,
          playing: s.currentIndex > 0,
        })),

      // ── Spotify device (not persisted) ───────────────────────────────────────
      spotifyDeviceId: null,
      setSpotifyDeviceId: (id) => set({ spotifyDeviceId: id }),

      // ── Player ────────────────────────────────────────────────────────
      playing: false,
      volume: 0.8,
      progress: 0,
      duration: 0,
      setPlaying: (playing) => set({ playing }),
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),

      // ── UI ────────────────────────────────────────────────────────────
      view: 'home',
      setupOpen: false,
      queueOpen: true,
      setView: (view) => set({ view }),
      setSetupOpen: (open) => set({ setupOpen: open }),
      setQueueOpen: (open) => set({ queueOpen: open }),
    }),
    {
      name: 'openmix-storage',
      partialize: (state) => ({
        config: state.config,
        spotify: {
          connected: state.spotify.connected,
          accessToken: state.spotify.accessToken,
          refreshToken: state.spotify.refreshToken,
          expiresAt: state.spotify.expiresAt,
          user: state.spotify.user,
        },
        queue: state.queue,
        volume: state.volume,
        queueOpen: state.queueOpen,
      }),
    }
  )
)

export default useStore
