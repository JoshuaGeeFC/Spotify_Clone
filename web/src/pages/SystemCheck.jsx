import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Diagnostic page at /check: confirms the database, buckets and sign-in work.
export default function SystemCheck() {
  const [session, setSession] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [buckets, setBuckets] = useState([])
  const [songCount, setSongCount] = useState(null)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('alice@example.com')
  const [password, setPassword] = useState('password123')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))

    async function load() {
      const p = await supabase.from('profiles').select('username, display_name, bio')
      if (p.error) return setError(p.error.message)
      setProfiles(p.data)

      const s = await supabase.from('songs').select('*', { count: 'exact', head: true })
      if (s.error) return setError(s.error.message)
      setSongCount(s.count)

      // Checks each bucket by listing its root (public buckets allow this).
      const names = ['audio', 'covers', 'avatars']
      const results = await Promise.all(
        names.map((b) => supabase.storage.from(b).list('', { limit: 1 }))
      )
      setBuckets(names.map((name, i) => ({ name, ok: !results[i].error })))
    }
    load()
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  return (
    <main>
      <h1>Tunebox: local stack check</h1>
      {error ? (
        <p className="bad">Database error: {error}</p>
      ) : (
        <p className="ok">Connected to Supabase.</p>
      )}

      <h2>Profiles</h2>
      <table>
        <thead><tr><th>Username</th><th>Name</th><th>Bio</th></tr></thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.username}><td>@{p.username}</td><td>{p.display_name}</td><td>{p.bio}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Songs</h2>
      <p>{songCount === null ? 'Checking…' : `${songCount} uploaded`}</p>

      <h2>Storage buckets</h2>
      <ul>
        {buckets.map((b) => (
          <li key={b.name} className={b.ok ? 'ok' : 'bad'}>
            {b.name}: {b.ok ? 'reachable' : 'not reachable'}
          </li>
        ))}
      </ul>

      <h2>Sign in</h2>
      {session ? (
        <p>
          Signed in as {session.user.email}.{' '}
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </p>
      ) : (
        <form onSubmit={signIn}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
          <button type="submit">Sign in</button>
        </form>
      )}
    </main>
  )
}
