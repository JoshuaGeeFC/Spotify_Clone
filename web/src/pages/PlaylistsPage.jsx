import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

// Your playlists, plus a form to make a new one.
export default function PlaylistsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [createError, setCreateError] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('playlists')
      .select('id, name, description, is_public, playlist_songs(count)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setLoadError(error.message)
        else setPlaylists(data)
      })
    return () => { cancelled = true }
  }, [user.id])

  async function handleCreate(e) {
    e.preventDefault()
    setBusy(true)
    setCreateError(null)
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      })
      .select('id')
      .single()
    setBusy(false)
    if (error) setCreateError(`Couldn't create the playlist: ${error.message}`)
    else navigate(`/playlists/${data.id}`)
  }

  return (
    <main>
      <h1>Your playlists</h1>

      {loadError && <p className="error">Couldn't load your playlists: {loadError}</p>}
      {!loadError && playlists === null && <p>Loading…</p>}
      {playlists?.length === 0 && <p className="muted">No playlists yet. Make your first one below.</p>}
      {playlists?.length > 0 && (
        <ul className="song-list">
          {playlists.map((p) => {
            const count = p.playlist_songs?.[0]?.count ?? 0
            return (
              <li key={p.id}>
                <Link to={`/playlists/${p.id}`} className="song-row">
                  <div className="thumb cover-placeholder" aria-hidden="true">≡</div>
                  <span>
                    <strong>{p.name}</strong>
                    <br />
                    <span className="muted">
                      {count} {count === 1 ? 'song' : 'songs'} · {p.is_public ? 'Public' : 'Private'}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <section className="create-playlist">
        <h2>New playlist</h2>
        <form className="form" onSubmit={handleCreate}>
          <label>
            Name
            <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </label>
          <label>
            Description (optional)
            <input maxLength={280} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} disabled={busy} />
            Public: anyone with the link can view it
          </label>
          {createError && <p className="error" role="alert">{createError}</p>}
          <button type="submit" className="primary" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create playlist'}
          </button>
        </form>
      </section>
    </main>
  )
}
