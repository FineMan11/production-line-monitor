/**
 * Authentication Context
 *
 * Provides user state and auth functions (login, logout) to the entire app.
 * Any component can access these with the useAuth() hook.
 *
 * Usage:
 *   import { useAuth } from '../context/AuthContext'
 *   const { user, login, logout } = useAuth()
 */
import { createContext, useContext, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Restore user from localStorage on page refresh.
  // If the user refreshes the page, we don't want to log them out.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  /**
   * Log in with username and password.
   * Stores tokens and user in localStorage, updates user state.
   * Throws an error if credentials are invalid (catch in the LoginPage).
   */
  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { access_token, refresh_token, user: userData } = res.data

    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)

    return userData
  }

  /**
   * Log out the current user.
   * Calls the backend to revoke the token, then clears local storage.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Even if the backend call fails, we still clear local state
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context.
 * Must be used inside a component wrapped by <AuthProvider>.
 */
export function useAuth() {
  return useContext(AuthContext)
}
