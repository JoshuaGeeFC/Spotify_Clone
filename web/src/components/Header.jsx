import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import DemoButton from './DemoButton'

export default function Header() {
  const { user, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const isDemo = user?.is_anonymous

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">Tunebox</Link>
        <nav aria-label="Account">
          {loading ? null : user ? (
            <>
              {isDemo && <span className="badge">Demo account</span>}
              {!isDemo && <Link to="/upload" className="button-link">Upload</Link>}
              <Link to="/me">Your songs</Link>
              <Link to="/playlists">Playlists</Link>
              {!isDemo && <span className="signed-in-as">{profile?.display_name ?? user.email}</span>}
              <button type="button" className="text-button" onClick={handleSignOut}>
                {isDemo ? 'Exit demo' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <DemoButton className="text-button" label="Try the demo" />
              <Link to="/signin">Sign in</Link>
              <Link to="/signup" className="button-link">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
