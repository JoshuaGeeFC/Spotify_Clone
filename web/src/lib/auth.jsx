import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

// Keeps track of who is signed in and loads their profile row.
// session is undefined while checking, null when signed out.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [loadedProfile, setLoadedProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_path')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setLoadedProfile(data))
  }, [userId])

  // Only trust the loaded profile if it belongs to the current user.
  const profile = loadedProfile && loadedProfile.id === userId ? loadedProfile : null

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading: session === undefined,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
