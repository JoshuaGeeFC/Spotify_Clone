import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import SongList from '../components/SongList'
import DemoButton from '../components/DemoButton'

// Every real upload, newest first. Demo accounts' copies are left out.
export default function HomePage() {
  const { user, loading } = useAuth()
  const [songs, setSongs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('songs')
      .select('id, title, artist, cover_path')
      .eq('is_demo', false)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setSongs(data)
      })
  }, [])

  return (
    <main>
      {!loading && !user && (
        <div className="notice">
          <p>Share your music and comment on other people's songs.</p>
          <DemoButton label="Try the demo, no sign-up needed" />
        </div>
      )}

      <h1>All songs</h1>

      {error && <p className="error">Couldn't load songs: {error}</p>}
      {!error && songs === null && <p>Loading songs…</p>}
      {songs?.length === 0 && (
        <p>No songs yet. <Link to="/upload">Upload the first one.</Link></p>
      )}
      {songs?.length > 0 && <SongList songs={songs} />}
    </main>
  )
}
