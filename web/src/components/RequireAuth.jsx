import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

// Wrap a page in this to send signed-out visitors to the sign-in page.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <main><p>Loading…</p></main>
  if (!user) {
    return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  return children
}
