import {
  createContext,
  useContext,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextType | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
