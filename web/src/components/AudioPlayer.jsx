import { useRef, useState } from 'react'

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Plays one audio file with play/pause, a seek bar, and elapsed/total time.
// Render it with key={src} so it starts fresh when the song changes.
export default function AudioPlayer({ src, title }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)

  async function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setError('This song could not be played.')
      }
    } else {
      audio.pause()
    }
  }

  function seek(e) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
    setCurrent(audio.currentTime)
  }

  return (
    <div className="player">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setError('The audio file could not be loaded. Check the audio_path in the songs table.')}
      />

      <button
        type="button"
        className="play-button"
        onClick={togglePlay}
        disabled={!!error}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      <div className="scrubber">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={current}
          onChange={seek}
          disabled={!duration || !!error}
          aria-label="Seek"
        />
        <div className="times">
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
