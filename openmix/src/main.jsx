import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// StrictMode intentionally double-invokes effects in development, which
// breaks the Spotify Web Playback SDK singleton (connect → cleanup → connect race).
createRoot(document.getElementById('root')).render(<App />)
