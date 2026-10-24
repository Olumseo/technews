import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (email, password) => {
    const { user } = await api('/api/auth/login', { method: 'POST', json: { email, password } })
    setUser(user)
    return user
  }, [])

  const signup = useCallback(async (details) => {
    const { user } = await api('/api/auth/signup', { method: 'POST', json: details })
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, ready, login, signup, logout, setUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

// Sends signed-out visitors to the sign-in page, then back here afterwards.
export function RequireAuth({ children, admin = false }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <p className="container state">Checking your sign-in…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && user.role !== 'admin') return <Navigate to="/studio" replace />
  return children
}
