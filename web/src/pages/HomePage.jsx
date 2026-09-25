import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, publicUrl } from '../lib/supabase'

// Lists every song, newest first. Each one links to its song page.
export default function HomePage() {
  const [songs, setSongs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('songs')
      .select('id, title, artist, cover_path')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setSongs(data)
      })
  }, [])

  return (
    <main>
      <h1>All songs</h1>

      {error && <p className="error">Couldn't load songs: {error}</p>}
      {!error && songs === null && <p>Loading songs…</p>}
      {songs?.length === 0 && (
        <p>No songs yet. <Link to="/upload">Upload the first one.</Link></p>
      )}

      {songs?.length > 0 && (
        <ul className="song-list">
          {songs.map((song) => {
            const cover = publicUrl('covers', song.cover_path)
            return (
              <li key={song.id}>
                <Link to={`/songs/${song.id}`} className="song-row">
                  {cover ? (
                    <img className="thumb" src={cover} alt="" />
                  ) : (
                    <div className="thumb cover-placeholder" aria-hidden="true">♪</div>
                  )}
                  <span>
                    <strong>{song.title}</strong>
                    <br />
                    {song.artist}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
