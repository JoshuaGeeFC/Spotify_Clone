import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, publicUrl } from '../lib/supabase'
import AudioPlayer from '../components/AudioPlayer'
import Comments from '../components/Comments'

// Milestone 1: one song, with its cover, title, artist, uploader and a player.
export default function SongPage() {
  const { id } = useParams()
  const [song, setSong] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | not-found | error
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('loading')
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist, audio_path, cover_path, created_at, uploader:profiles(username, display_name)')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setErrorMessage(error.message)
        setStatus('error')
      } else if (!data) {
        setStatus('not-found')
      } else {
        setSong(data)
        setStatus('ready')
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (status === 'loading') return <main><p>Loading song…</p></main>

  if (status === 'not-found') {
    return (
      <main>
        <p>That song doesn't exist.</p>
        <Link to="/">Back to all songs</Link>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main>
        <p className="error">Couldn't load this song: {errorMessage}</p>
        <Link to="/">Back to all songs</Link>
      </main>
    )
  }

  const cover = publicUrl('covers', song.cover_path)

  return (
    <main>
      <Link to="/" className="back-link">← All songs</Link>

      <article className="song">
        {cover ? (
          <img className="cover" src={cover} alt={`Cover art for ${song.title}`} />
        ) : (
          <div className="cover cover-placeholder" aria-hidden="true">♪</div>
        )}

        <div className="song-info">
          <h1>{song.title}</h1>
          <p className="artist">{song.artist}</p>
          {song.uploader && (
            <p className="uploader">Uploaded by {song.uploader.display_name}</p>
          )}
        </div>

        <AudioPlayer key={song.audio_path} src={publicUrl('audio', song.audio_path)} title={song.title} />
      </article>

      <Comments songId={song.id} />
    </main>
  )
}
