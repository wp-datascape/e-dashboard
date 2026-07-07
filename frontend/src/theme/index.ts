import { createTheme, type Theme } from '@mui/material/styles'
import { PALETTES, DEFAULT_PALETTE, type PaletteKey } from './palettes'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const FONT_PRIMARY = '"Plus Jakarta Sans"'
const FONT_MONO    = '"Plus Jakarta Sans"'

const BORDER_RADIUS = 10

// Warna semantik (success/warning/error/info) SENGAJA tetap sama di semua palette
// (Task003 §2.1) - cuma primary/secondary yang ikut ganti sesuai PALETTES.
const SEMANTIC = {
  light: { success: '#059669', warning: '#D97706', error: '#DC2626', info: '#0891B2' },
  dark:  { success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#06B6D4' },
}

const TYPOGRAPHY = {
  fontFamily: FONT_PRIMARY,
  h1: { fontSize: '2rem',    fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25 },
  h3: { fontSize: '1.5rem',  fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: '1rem',    fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '0.875rem',fontWeight: 600, lineHeight: 1.4 },
  body1: { fontSize: '0.875rem', lineHeight: 1.6 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.6 },
  caption: { fontSize: '0.75rem', fontFamily: FONT_MONO },
  overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
}

// ─── Factory ──────────────────────────────────────────────────────────────────
export function createAppTheme(mode: 'light' | 'dark', paletteKey: PaletteKey = DEFAULT_PALETTE): Theme {
  const colors = PALETTES[paletteKey] ?? PALETTES[DEFAULT_PALETTE]
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary:   { main: isDark ? colors.primary.dark   : colors.primary.light,   contrastText: '#fff' },
      secondary: { main: isDark ? colors.secondary.dark : colors.secondary.light, contrastText: '#fff' },
      success:   { main: isDark ? SEMANTIC.dark.success : SEMANTIC.light.success },
      warning:   { main: isDark ? SEMANTIC.dark.warning : SEMANTIC.light.warning },
      error:     { main: isDark ? SEMANTIC.dark.error   : SEMANTIC.light.error },
      info:      { main: isDark ? SEMANTIC.dark.info    : SEMANTIC.light.info },
      background: isDark
        ? { default: '#0B1120', paper: '#111827' } // hampir hitam / gray-900
        : { default: '#F8FAFC', paper: '#FFFFFF' }, // slate-50
      text: isDark
        ? { primary: '#F1F5F9', secondary: '#94A3B8', disabled: '#475569' } // slate-100/400/600
        : { primary: '#0F172A', secondary: '#475569', disabled: '#94A3B8' }, // slate-900/600/400
      divider: isDark ? '#1E293B' : '#E2E8F0', // slate-800 / slate-200
    },
    typography: TYPOGRAPHY,
    shape: { borderRadius: BORDER_RADIUS },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Transisi global background-color/border-color/color (BUKAN 'all' atau
          // 'transform' - itu bisa ganggu animasi lain, mis. knob ThemeToggle) supaya
          // toggle light<->dark terasa smooth di seluruh app, bukan cuma loncat
          // instan. Selector '*' aman di sini karena scope-nya cuma warna, dan
          // komponen yang punya transition sendiri (lebih spesifik, mis. ThemeToggle)
          // tetap menang lewat CSS specificity, tidak ke-override rule global ini.
          '*': {
            transitionProperty: 'background-color, border-color, color',
            transitionDuration: '0.25s',
            transitionTimingFunction: 'ease',
          },
          body: isDark
            ? { scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }
            : { scrollbarWidth: 'thin' },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? colors.appBar.dark : colors.appBar.light,
            color: '#fff',
            boxShadow: isDark ? '0 1px 0 rgba(255,255,255,0.05)' : '0 1px 0 rgba(0,0,0,0.12)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: BORDER_RADIUS },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: isDark
            ? { borderRadius: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid #1E293B', backgroundImage: 'none' }
            : { borderRadius: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: isDark ? { borderRadius: 0, backgroundImage: 'none' } : { borderRadius: 0 },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500 } },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              color: isDark ? '#94A3B8' : '#475569',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: '0.75rem' },
        },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 999 } },
      },
    },
  })
}
