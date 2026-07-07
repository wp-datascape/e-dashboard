import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createAppTheme } from './index'
import { DEFAULT_PALETTE, isPaletteKey, type PaletteKey } from './palettes'
import { ThemeContext, type ThemeMode, type ThemeContextValue } from './theme.context'

const STORAGE_KEY = 'exec-dashboard-theme'
const PALETTE_STORAGE_KEY = 'exec-dashboard-palette'

// ─── Provider ─────────────────────────────────────────────────────────────────
interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Baca preferensi dari localStorage dulu (anti-flash, cepat) - App.tsx akan
  // override begitu /auth/me resolve dan user punya preferences tersimpan di
  // backend (lihat applyRemotePreferences di bawah).
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [palette, setPaletteState] = useState<PaletteKey>(() => {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY)
    return saved && isPaletteKey(saved) ? saved : DEFAULT_PALETTE
  })

  // Sync ke localStorage setiap kali mode berubah
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
    // Update meta theme-color untuk mobile browser
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'dark' ? '#0B1120' : '#F8FAFC')
    }
  }, [mode])

  useEffect(() => {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette)
  }, [palette])

  const toggleTheme = useCallback(() => setMode(prev => (prev === 'light' ? 'dark' : 'light')), [])
  const setPalette = useCallback((p: PaletteKey) => setPaletteState(p), [])

  const applyRemotePreferences = useCallback((prefs: { theme_mode?: ThemeMode; color_palette?: string }) => {
    if (prefs.theme_mode === 'light' || prefs.theme_mode === 'dark') setMode(prefs.theme_mode)
    if (prefs.color_palette && isPaletteKey(prefs.color_palette)) setPaletteState(prefs.color_palette)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleTheme, isDark: mode === 'dark', palette, setPalette, applyRemotePreferences }),
    [mode, palette, toggleTheme, setPalette, applyRemotePreferences],
  )

  const muiTheme = useMemo(() => createAppTheme(mode, palette), [mode, palette])

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
