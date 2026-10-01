import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

// "Add to playlist" control shown on a song's page for signed-in users.
export default function AddToPlaylist({ songId }) {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState(null)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { ok, text, playlistId }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('playlists')
      .select('id, name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return
        setPlaylists(data)
        if (data.length > 0) setSelected(data[0].id)
      })
    return () => { cancelled = true }
  }, [user])

  if (!user || playlists === null) return null

  if (playlists.length === 0) {
    return (
      <p className="add-to-playlist muted">
        <Link to="/playlists">Create a playlist</Link> to save this song to it.
      </p>
    )
  }

  async function handleAdd(e) {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    const name = playlists.find((p) => p.id === selected)?.name
    const { error } = await supabase
      .from('playlist_songs')
      .insert({ playlist_id: selected, song_id: songId })
    setBusy(false)
    if (!error) setResult({ ok: true, text: `Added to ${name}.`, playlistId: selected })
    else if (error.code === '23505') setResult({ ok: true, text: `Already in ${name}.`, playlistId: selected })
    else setResult({ ok: false, text: `Couldn't add it: ${error.message}` })
  }

  return (
    <form className="add-to-playlist" onSubmit={handleAdd}>
      <label htmlFor="playlist-select">Add to playlist</label>
      <select
        id="playlist-select"
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setResult(null) }}
        disabled={busy}
      >
        {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button type="submit" className="secondary" disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
      {result && (
        <span className={result.ok ? 'ok' : 'error'} role="status">
          {result.text}{' '}
          {result.playlistId && <Link to={`/playlists/${result.playlistId}`}>View playlist</Link>}
        </span>
      )}
    </form>
  )
}
