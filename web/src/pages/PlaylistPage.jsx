import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, publicUrl } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { formatTime } from '../lib/format'
import AudioPlayer from '../components/AudioPlayer'

function fetchPlaylist(id) {
  return supabase
    .from('playlists')
    .select(`
      id, name, description, is_public, owner_id,
      owner:profiles(display_name, username),
      playlist_songs(position, song:songs(id, title, artist, cover_path, audio_path, duration_seconds))
    `)
    .eq('id', id)
    .maybeSingle()
}

// One playlist: plays its songs in order. The owner can remove songs,
// switch it between public and private, or delete it.
export default function PlaylistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [playlist, setPlaylist] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | not-found | error
  const [message, setMessage] = useState(null)
  const [nowPlaying, setNowPlaying] = useState(null) // index into songs, or null
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPlaylist(id).then(({ data, error }) => {
      if (cancelled) return
      if (error) { setMessage(error.message); setStatus('error') }
      else if (!data) setStatus('not-found')
      else { setPlaylist(data); setStatus('ready') }
    })
    return () => { cancelled = true }
  }, [id])

  async function reload() {
    const { data } = await fetchPlaylist(id)
    if (data) setPlaylist(data)
  }

  if (status === 'loading') return <main><p>Loading playlist…</p></main>
  if (status === 'not-found') {
    return (
      <main>
        <p>This playlist doesn't exist, or it's private.</p>
        <Link to="/">Back to all songs</Link>
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main>
        <p className="error">Couldn't load this playlist: {message}</p>
        <Link to="/">Back to all songs</Link>
      </main>
    )
  }

  const isOwner = user?.id === playlist.owner_id
  const songs = [...playlist.playlist_songs]
    .sort((a, b) => a.position - b.position)
    .map((row) => row.song)
    .filter(Boolean)
  const current = nowPlaying !== null ? songs[nowPlaying] : null

  async function removeSong(songId, index) {
    setBusy(true)
    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlist.id)
      .eq('song_id', songId)
    setBusy(false)
    if (error) return setMessage(`Couldn't remove that song: ${error.message}`)
    // Keep the right song playing if the removed one came before it.
    if (nowPlaying !== null) {
      if (index === nowPlaying) setNowPlaying(null)
      else if (index < nowPlaying) setNowPlaying(nowPlaying - 1)
    }
    reload()
  }

  async function toggleVisibility() {
    setBusy(true)
    const { error } = await supabase
      .from('playlists')
      .update({ is_public: !playlist.is_public })
      .eq('id', playlist.id)
    setBusy(false)
    if (error) setMessage(`Couldn't change visibility: ${error.message}`)
    else reload()
  }

  async function deletePlaylist() {
    if (!window.confirm(`Delete "${playlist.name}"? The songs themselves won't be deleted.`)) return
    setBusy(true)
    const { error } = await supabase.from('playlists').delete().eq('id', playlist.id)
    setBusy(false)
    if (error) setMessage(`Couldn't delete the playlist: ${error.message}`)
    else navigate('/playlists')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage('Couldn\'t copy automatically. Copy the address from your browser bar instead.')
    }
  }

  function playNext() {
    setNowPlaying((i) => (i !== null && i + 1 < songs.length ? i + 1 : null))
  }

  return (
    <main>
      {isOwner && <Link to="/playlists" className="back-link">← Your playlists</Link>}

      <header className="playlist-header">
        <p className="muted">{playlist.is_public ? 'Public playlist' : 'Private playlist'}</p>
        <h1>{playlist.name}</h1>
        {playlist.description && <p>{playlist.description}</p>}
        <p className="muted">
          By {playlist.owner?.display_name} · {songs.length} {songs.length === 1 ? 'song' : 'songs'}
        </p>

        <div className="playlist-actions">
          <button
            type="button"
            className="primary"
            onClick={() => setNowPlaying(0)}
            disabled={songs.length === 0}
          >
            Play all
          </button>
          {playlist.is_public && (
            <button type="button" className="secondary" onClick={copyLink}>
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          )}
          {isOwner && (
            <>
              <button type="button" className="secondary" onClick={toggleVisibility} disabled={busy}>
                Make {playlist.is_public ? 'private' : 'public'}
              </button>
              <button type="button" className="text-button danger" onClick={deletePlaylist} disabled={busy}>
                Delete playlist
              </button>
            </>
          )}
        </div>
        {message && <p className="error" role="alert">{message}</p>}
      </header>

      {current && (
        <div className="now-playing">
          <p>
            Now playing {nowPlaying + 1} of {songs.length}:{' '}
            <Link to={`/songs/${current.id}`}><strong>{current.title}</strong></Link> by {current.artist}
          </p>
          <AudioPlayer
            key={`${current.id}-${nowPlaying}`}
            src={publicUrl('audio', current.audio_path)}
            title={current.title}
            autoPlay
            onEnded={playNext}
          />
        </div>
      )}

      {songs.length === 0 ? (
        <p className="muted">
          This playlist is empty.{isOwner && ' Open any song and use "Add to playlist" to fill it.'}
        </p>
      ) : (
        <ol className="playlist-tracks">
          {songs.map((song, index) => {
            const cover = publicUrl('covers', song.cover_path)
            const isCurrent = index === nowPlaying
            return (
              <li key={song.id} className={`track${isCurrent ? ' current' : ''}`}>
                <button
                  type="button"
                  className="track-play"
                  onClick={() => setNowPlaying(index)}
                  aria-label={`Play ${song.title}`}
                >
                  {isCurrent ? '♪' : index + 1}
                </button>
                {cover ? (
                  <img className="thumb small" src={cover} alt="" />
                ) : (
                  <div className="thumb small cover-placeholder" aria-hidden="true">♪</div>
                )}
                <Link to={`/songs/${song.id}`} className="track-title">
                  <strong>{song.title}</strong>
                  <br />
                  <span className="muted">{song.artist}</span>
                </Link>
                <span className="muted track-time">
                  {song.duration_seconds ? formatTime(song.duration_seconds) : ''}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => removeSong(song.id, index)}
                    disabled={busy}
                    aria-label={`Remove ${song.title} from this playlist`}
                  >
                    Remove
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </main>
  )
}
