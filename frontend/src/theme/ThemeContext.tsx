import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { lightTheme, darkTheme } from './index'

// ─── Types ────────────────────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  toggleTheme: () => void
  isDark: boolean
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'exec-dashboard-theme'

// ─── Provider ─────────────────────────────────────────────────────────────────
interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Baca preferensi dari localStorage, fallback ke system preference
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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

  const toggleTheme = () => setMode(prev => (prev === 'light' ? 'dark' : 'light'))

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleTheme, isDark: mode === 'dark' }),
    [mode],
  )

  const muiTheme = mode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode harus dipakai di dalam <ThemeProvider>')
  return ctx
}
