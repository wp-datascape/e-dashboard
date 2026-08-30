import { createTheme, type Theme } from '@mui/material/styles'
import { PALETTES, DEFAULT_PALETTE, type PaletteKey } from './palettes'

// ─── Custom Typography Variants ────────────────────────────────────────────────
// pageTitle/pageSubtitle — variant KHUSUS untuk judul halaman, TERPISAH dari h5
// (h5 juga dipakai untuk angka besar di StatCard/DonutChartWidget/dll — kalau
// judul halaman ikut ganti warna lewat override h5 biasa, angka data ikut kena
// juga, tidak diinginkan). Warna ikut palette (primary.main), didefinisikan di
// SATU tempat (createAppTheme di bawah) - ganti di sini otomatis berlaku ke
// semua halaman yang pakai variant="pageTitle", tidak perlu edit satu-satu.
declare module '@mui/material/styles' {
  interface TypographyVariants {
    pageTitle: React.CSSProperties
    pageSubtitle: React.CSSProperties
  }
  interface TypographyVariantsOptions {
    pageTitle?: React.CSSProperties
    pageSubtitle?: React.CSSProperties
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    pageTitle: true
    pageSubtitle: true
  }
}

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
    typography: {
      ...TYPOGRAPHY,
      // Warna ikut palette aktif (primary.light/dark, sama seperti palette.primary.main
      // di atas) - beda dari h5 biasa yang warnanya netral (text.primary) supaya tidak
      // bentrok dengan pemakaian h5 lain (angka besar StatCard/DonutChartWidget).
      pageTitle: {
        fontSize: '1.375rem',
        fontWeight: 700,
        lineHeight: 1.3,
        color: isDark ? colors.primary.dark : colors.primary.light,
      },
      pageSubtitle: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        color: isDark ? '#94A3B8' : '#475569', // sama dengan text.secondary di atas
      },
    },
    shape: { borderRadius: BORDER_RADIUS },
    components: {
      MuiTypography: {
        defaultProps: {
          // pageTitle/pageSubtitle TIDAK ada di default variantMapping MUI, tanpa ini
          // Typography fallback ke <span> (inline) - title dan subtitle jadi nempel di
          // baris yang sama, bukan bertumpuk ke bawah seperti h5+body2 sebelumnya.
          // pageTitle -> h1 (semantically benar, 1 judul utama per halaman untuk a11y).
          variantMapping: {
            pageTitle: 'h1',
            pageSubtitle: 'p',
          },
        },
        // Dukung prop `color` path bertitik, mis. `color="text.secondary"`
        // (2026-08-25, koreksi user: "Semua harus tercentral dari theme
        // config" — susulan bug "text tooltip tidak terbaca di mode
        // terang"). Root cause: Typography BAWAAN MUI cuma generate style
        // utk key warna TANPA titik (lihat @mui/material/Typography/
        // Typography.js — top-level palette key spt "primary"/"warning",
        // atau "textSecondary"/"textPrimary"/"textDisabled" tanpa titik).
        // Konvensi path bertitik (`"text.secondary"`, `"warning.main"`,
        // dst) dipakai di RATUSAN tempat di seluruh app — sebelumnya SEMUA
        // itu gagal SENYAP (tanpa error/warning), warisi color ambient
        // (kelihatan fatal di dalam MuiTooltip yang defaultnya putih).
        // Rule generik ini resolve `<paletteKey>.<shade>` APAPUN dari 1
        // tempat (theme config), bukan ganti satu-satu di tiap file —
        // otomatis berlaku ke SEMUA pemakaian lama maupun baru.
        variants: [
          {
            props: ({ ownerState }) => typeof ownerState.color === 'string' && ownerState.color.includes('.'),
            // `style` (beda dari `props` di atas) tipenya dibatasi MUI cuma
            // `{ theme: Theme }` (lihat @mui/material/styles/variants.d.ts)
            // — TIDAK mendeklarasikan `ownerState` walau runtime-nya
            // (createStyled.js `processStyleVariants`) SELALU nge-spread
            // properti ownerState (termasuk `color`) LANGSUNG ke object
            // yang sama, bukan cuma nested di `.ownerState`. Diakses
            // sbg properti langsung (`props.color`) di sini utk menghindari
            // gap tipe itu, bukan `as any`.
            style: (props: { theme: Theme; color?: unknown }) => {
              if (typeof props.color !== 'string') return {}
              const [key, shade] = props.color.split('.')
              const group = (props.theme.palette as unknown as Record<string, Record<string, string> | undefined>)[key]
              const resolved = group?.[shade]
              return resolved ? { color: resolved } : {}
            },
          },
        ],
      },
      MuiCssBaseline: {
        styleOverrides: {
          // colorScheme (2026-08-30, laporan user: "background area scroll
          // bar berwarna hitam" di mode light) — `index.css` (:root) set
          // `color-scheme: light dark` statis, TIDAK PERNAH disinkronkan ke
          // `mode` app (ThemeContext.tsx, toggle manual independen dari OS).
          // Browser bebas pilih skema native (scrollbar, kontrol form) ikut
          // preferensi OS kalau keduanya "light dark" diizinkan — begitu OS
          // dark tapi app displaying light (putih), scrollbar native tetap
          // dirender gelap, kontras tajam. Deklarasi eksplisit di sini
          // (bukan inherited dari :root) menang di body & seluruh
          // descendant-nya (termasuk <main>, virtualScroller DataGrid, dst).
          body: isDark
            ? { colorScheme: 'dark', scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }
            : { colorScheme: 'light', scrollbarWidth: 'thin' },
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
      // body1 (dipakai MUI sebagai basis font input) di-set 0.875rem (14px) di
      // TYPOGRAPHY atas untuk densitas desktop - tapi di bawah 16px, Safari/WebKit
      // iOS otomatis ZOOM saat input di-fokus (perilaku native OS, bukan bug app)
      // supaya teks tetap kebaca, lalu screen "lompat" balik saat blur - persis
      // kesan "layar bergeser kayak zoom out/in" di PWA mobile. Override KHUSUS
      // viewport mobile (breakpoint 'md' down, 899.95px - sama dengan breakpoint
      // isMobile yang dipakai DashboardLayout/ResponsiveListView) ke 16px persis,
      // supaya WebKit tidak pernah merasa perlu zoom. Desktop tetap 14px asli.
      MuiInputBase: {
        styleOverrides: {
          input: { '@media (max-width:899.95px)': { fontSize: '16px' } },
        },
      },
    },
  })
}
