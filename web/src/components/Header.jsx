import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Header() {
  const { user, profile, loading, signOut } = useAuth()

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">Tunebox</Link>
        <nav aria-label="Account">
          {loading ? null : user ? (
            <>
              <Link to="/upload" className="button-link">Upload</Link>
              <span className="signed-in-as">{profile?.display_name ?? user.email}</span>
              <button type="button" className="text-button" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/signin">Sign in</Link>
              <Link to="/signup" className="button-link">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
