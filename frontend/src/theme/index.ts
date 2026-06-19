import { createTheme, type Theme } from '@mui/material/styles'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const FONT_PRIMARY = '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica Neue", Arial, sans-serif'
const FONT_MONO    = '"JetBrains Mono", "Fira Code", monospace'

const BORDER_RADIUS = 10

// Brand palette — tetap sama di light/dark
const BRAND = {
  primary:   '#2563EB', // blue-600
  secondary: '#7C3AED', // violet-600
  success:   '#059669', // emerald-600
  warning:   '#D97706', // amber-600
  error:     '#DC2626', // red-600
  info:      '#0891B2', // cyan-600
}

// ─── Light Theme ──────────────────────────────────────────────────────────────
export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: BRAND.primary,   contrastText: '#fff' },
    secondary: { main: BRAND.secondary, contrastText: '#fff' },
    success:   { main: BRAND.success },
    warning:   { main: BRAND.warning },
    error:     { main: BRAND.error },
    info:      { main: BRAND.info },
    background: {
      default: '#F8FAFC', // slate-50
      paper:   '#FFFFFF',
    },
    text: {
      primary:   '#0F172A', // slate-900
      secondary: '#475569', // slate-600
      disabled:  '#94A3B8', // slate-400
    },
    divider: '#E2E8F0',    // slate-200
  },
  typography: {
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
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: BORDER_RADIUS },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { scrollbarWidth: 'thin' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none', boxShadow: '0 1px 0 #E2E8F0' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: BORDER_RADIUS },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 0 },
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
            backgroundColor: '#F1F5F9',
            color: '#475569',
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

// ─── Dark Theme ───────────────────────────────────────────────────────────────
export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#3B82F6', contrastText: '#fff' }, // blue-500 (lebih terang di dark)
    secondary: { main: '#8B5CF6', contrastText: '#fff' }, // violet-500
    success:   { main: '#10B981' },
    warning:   { main: '#F59E0B' },
    error:     { main: '#EF4444' },
    info:      { main: '#06B6D4' },
    background: {
      default: '#0B1120', // hampir hitam
      paper:   '#111827', // gray-900
    },
    text: {
      primary:   '#F1F5F9', // slate-100
      secondary: '#94A3B8', // slate-400
      disabled:  '#475569', // slate-600
    },
    divider: '#1E293B',    // slate-800
  },
  typography: {
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
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: BORDER_RADIUS },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none', boxShadow: '0 1px 0 #1E293B' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: BORDER_RADIUS },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          border: '1px solid #1E293B',
          backgroundImage: 'none',
        },
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
            backgroundColor: '#1E293B',
            color: '#94A3B8',
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
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 0, backgroundImage: 'none' },
      },
    },
  },
})