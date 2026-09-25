import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const MAX_LENGTH = 1000

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function fetchComments(songId) {
  return supabase
    .from('comments')
    .select('id, body, created_at, author:profiles(username, display_name)')
    .eq('song_id', songId)
    .order('created_at', { ascending: true })
}

// Comments for one song: the list (oldest first) and a box to add one.
export default function Comments({ songId }) {
  const { user } = useAuth()
  const location = useLocation()
  const [comments, setComments] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)

  // Load comments whenever the song changes. Ignores a slow response for a
  // song you've already navigated away from.
  useEffect(() => {
    let cancelled = false
    fetchComments(songId).then(({ data, error }) => {
      if (cancelled) return
      if (error) setLoadError(error.message)
      else setComments(data)
    })
    return () => { cancelled = true }
  }, [songId])

  async function handleSubmit(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setPosting(true)
    setPostError(null)
    const { error } = await supabase
      .from('comments')
      .insert({ song_id: songId, author_id: user.id, body: text })
    setPosting(false)
    if (error) {
      setPostError(`Couldn't post your comment: ${error.message}`)
    } else {
      setBody('')
      const { data } = await fetchComments(songId)
      if (data) setComments(data)
    }
  }

  return (
    <section className="comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading">
        Comments{comments ? ` (${comments.length})` : ''}
      </h2>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <label htmlFor="comment-body" className="visually-hidden">Add a comment</label>
          <textarea
            id="comment-body"
            rows={3}
            maxLength={MAX_LENGTH}
            placeholder="Add a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={posting}
          />
          <div className="comment-form-footer">
            <span className="hint">{body.length}/{MAX_LENGTH}</span>
            <button type="submit" className="primary" disabled={posting || !body.trim()}>
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
          {postError && <p className="error" role="alert">{postError}</p>}
        </form>
      ) : (
        <p>
          <Link to={`/signin?next=${encodeURIComponent(location.pathname)}`}>Sign in</Link> to leave a comment.
        </p>
      )}

      {loadError && <p className="error">Couldn't load comments: {loadError}</p>}
      {!loadError && comments === null && <p>Loading comments…</p>}
      {comments?.length === 0 && <p className="muted">No comments yet. Be the first.</p>}

      {comments?.length > 0 && (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <p className="comment-meta">
                <strong>{c.author?.display_name ?? 'Unknown'}</strong>{' '}
                <span className="muted">@{c.author?.username} · {formatDate(c.created_at)}</span>
              </p>
              <p className="comment-body">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
