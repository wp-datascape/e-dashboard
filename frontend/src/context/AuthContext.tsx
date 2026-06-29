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

  const syncUser = (newUser: User, newPermissions: string[]) => {
    setUserState(newUser)
    setPermissions(newPermissions)
    localStorage.setItem('auth_user', JSON.stringify(newUser))
    localStorage.setItem('auth_permissions', JSON.stringify(newPermissions))
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
        syncUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Protected Route ──────────────────────────────────────────────────────────
export function ProtectedRoute({ children, permissionKey }: { children: ReactNode; permissionKey?: string }) {
  const { isAuthenticated, isLoading, permissions } = useAuth()
  const location = useLocation()

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (permissionKey && !permissions.includes(permissionKey)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
