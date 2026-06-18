import {
  createContext,
  useContext,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark'

export interface ThemeContextValue {
  mode: ThemeMode
  toggleTheme: () => void
  isDark: boolean
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const ThemeContext = createContext<ThemeContextValue | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode harus dipakai di dalam <ThemeProvider>')
  return ctx
}
