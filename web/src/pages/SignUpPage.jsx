import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Same rule the database enforces on profiles.username.
const USERNAME_RULE = /^[a-z0-9_]{3,30}$/

export default function SignUpPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const cleanUsername = username.trim().toLowerCase()
    if (!USERNAME_RULE.test(cleanUsername)) {
      setError('Username must be 3 to 30 characters: lowercase letters, numbers or underscores.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Read by the handle_new_user trigger to fill in the profile.
        data: { username: cleanUsername, display_name: displayName.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    setBusy(false)

    if (error) setError(error.message)
    else if (data.session) navigate(next, { replace: true }) // email confirmation is off
    else setCheckEmail(true) // email confirmation is on
  }

  if (checkEmail) {
    return (
      <main className="narrow">
        <h1>Check your email</h1>
        <p>We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and sign in.</p>
        <Link to="/signin">Go to sign in</Link>
      </main>
    )
  }

  return (
    <main className="narrow">
      <h1>Create an account</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Display name
          <input required maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label>
          Username
          <input required autoComplete="username" maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} />
          <span className="hint">Lowercase letters, numbers and underscores.</span>
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="hint">At least 6 characters.</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
      </form>
      <p>Already have an account? <Link to={`/signin?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
    </main>
  )
}
