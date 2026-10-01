import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Signs the visitor into a brand-new temporary account, fills it with
// copies of the demo songs, and takes them to "Your songs".
export default function DemoButton({ className = 'primary', label = 'Try the demo' }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function startDemo() {
    setBusy(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInAnonymously()
    if (signInError) {
      setBusy(false)
      setError(
        /anonymous sign-ins are disabled/i.test(signInError.message)
          ? 'The demo isn\'t switched on yet. In Supabase, turn on anonymous sign-ins.'
          : `Couldn't start the demo: ${signInError.message}`
      )
      return
    }

    const { error: setupError } = await supabase.rpc('start_demo')
    setBusy(false)
    if (setupError) {
      setError(`Signed in, but couldn't add the demo songs: ${setupError.message}`)
      return
    }
    navigate('/me')
  }

  return (
    <span className="demo-button">
      <button type="button" className={className} onClick={startDemo} disabled={busy}>
        {busy ? 'Starting demo…' : label}
      </button>
      {error && <span className="error" role="alert">{error}</span>}
    </span>
  )
}
