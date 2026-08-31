import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { loginRequest, registerRequest } from '../api/client'

/* eslint-disable react/only-export-components -- useAuth is a hook intentionally co-located with AuthProvider */

const TOKEN_KEY = 'nf_token'
const USER_KEY = 'nf_user'

/**
 * AuthContext — holds the signed-in user + token for the whole app.
 *
 * Persistence: sessionStorage (cleared when the tab closes). Swap to
 * localStorage here if you want sessions to survive closing the tab.
 *
 * Exposes: user, token, isAuthenticated, hasRole(...roles),
 *          login(email, password), register(payload), logout()
 */
const AuthContext = createContext(null)

function readStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY)) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY))

  const persist = useCallback((nextUser, nextToken) => {
    sessionStorage.setItem(TOKEN_KEY, nextToken)
    sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    setToken(nextToken)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const { user: nextUser, token: nextToken } = await loginRequest({ email, password })
      persist(nextUser, nextToken)
      return nextUser
    },
    [persist],
  )

  const register = useCallback(
    async (payload) => {
      const { user: nextUser, token: nextToken } = await registerRequest(payload)
      persist(nextUser, nextToken)
      return nextUser
    },
    [persist],
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setUser(null)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      /** hasRole('ADMIN', 'TEAM_LEAD') → true if the signed-in user has one of these roles. */
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
      login,
      register,
      logout,
    }),
    [user, token, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
