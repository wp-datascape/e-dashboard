import {
  createContext,
  useContext,
} from 'react'
import type { PaletteKey } from './palettes'

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark'

export interface ThemeContextValue {
  mode: ThemeMode
  toggleTheme: () => void
  isDark: boolean
  palette: PaletteKey
  setPalette: (palette: PaletteKey) => void
  /**
   * Terapkan preferensi dari backend (dipanggil App.tsx begitu /auth/me resolve) -
   * override state + cache localStorage TANPA panggil balik endpoint update (beda
   * dari setPalette/toggleTheme yang dipanggil user, itu yang sync ke backend).
   */
  applyRemotePreferences: (prefs: { theme_mode?: ThemeMode; color_palette?: string }) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const ThemeContext = createContext<ThemeContextValue | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode harus dipakai di dalam <ThemeProvider>')
  return ctx
}
