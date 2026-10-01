import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import SongList from '../components/SongList'

// The signed-in user's own songs. Demo visitors land here.
export default function MyLibraryPage() {
  const { user, profile } = useAuth()
  const [songs, setSongs] = useState(null)
  const [error, setError] = useState(null)
  const isDemo = user?.is_anonymous

  useEffect(() => {
    let cancelled = false
    supabase
      .from('songs')
      .select('id, title, artist, cover_path')
      .eq('uploader_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setSongs(data)
      })
    return () => { cancelled = true }
  }, [user.id])

  return (
    <main>
      <h1>Your songs</h1>
      {profile && <p className="muted">Signed in as {profile.display_name} (@{profile.username})</p>}

      {isDemo && (
        <div className="notice">
          <p>
            <strong>You're in a demo account.</strong> It came with a few songs so you can look
            around, play music and leave comments. Anything you change only affects your copy,
            and the account is deleted after 24 hours.
          </p>
          <p>
            Demo accounts can't upload files. To upload your own music, choose
            {' '}<strong>Exit demo</strong> and create an account.
          </p>
        </div>
      )}

      {error && <p className="error">Couldn't load your songs: {error}</p>}
      {!error && songs === null && <p>Loading…</p>}
      {songs?.length === 0 && (
        isDemo
          ? <p>No demo songs are set up yet. Add songs to the demo_template_songs table in Supabase.</p>
          : <p>You haven't uploaded anything yet. <Link to="/upload">Upload a song.</Link></p>
      )}
      {songs?.length > 0 && <SongList songs={songs} />}
    </main>
  )
}
