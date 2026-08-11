import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { auth } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session on mount
    auth.getSession().then(setUser).finally(() => setLoading(false))

    // Keep user state in sync with Supabase auth events
    // (token refresh, sign-out from another tab, etc.)
    const unsubscribe = auth.onAuthStateChange((u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signUp = useCallback(async (payload) => {
    const u = await auth.signUp(payload)
    setUser(u)
    return u
  }, [])

  const signIn = useCallback(async (payload) => {
    const u = await auth.signIn(payload)
    setUser(u)
    return u
  }, [])

  const signOut = useCallback(async () => {
    await auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
