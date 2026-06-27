import {
  useState,
  type ReactNode,
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext, useAuth, type User } from './auth.context'

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))

  const [userState, setUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user')
    try { return saved ? JSON.parse(saved) : null } catch { return null }
  })

  const [permissions, setPermissions] = useState<string[]>(() => {
    const saved = localStorage.getItem('auth_permissions')
    try { return saved ? JSON.parse(saved) : [] } catch { return [] }
  })

  const [isLoading] = useState(false)

  const login = (newToken: string, newUser: User, newPermissions: string[]) => {
    setToken(newToken)
    setUserState(newUser)
    setPermissions(newPermissions)
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('auth_user', JSON.stringify(newUser))
    localStorage.setItem('auth_permissions', JSON.stringify(newPermissions))
  }

  const logout = () => {
    setToken(null)
    setUserState(null)
    setPermissions([])
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_permissions')
  }

  return (
    <AuthContext.Provider
      value={{
        user: userState,
        token,
        permissions,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Protected Route ──────────────────────────────────────────────────────────
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
