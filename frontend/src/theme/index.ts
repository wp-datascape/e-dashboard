import { createTheme, alpha, type Theme } from '@mui/material/styles'
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

// ─── Custom Theme Tokens (data + soft tint) ────────────────────────────────────
// Konsolidasi hasil audit warna 2026-08-09 (task026 §8r/§8s, disempurnakan
// dokumen "Sistem Triad Warna" tgl sama): 1 warna = 1 peran, TAPI dashboard
// jangan monokrom.
// - `data`   : TRIAD 3 hue BEDA per-palette = [primary, companion.secondary,
//              companion.tertiary] (companion di palettes.ts, dikurasi
//              desainer via strategi analogous/triadic/split-complement per
//              palet - lihat komentar tiap entri PALETTES) - utk metrik
//              independen satu sama lain (mis. chart M3: Avg/Median/
//              Kontribusi HM). `primary` SENDIRI jadi hue data pertama
//              (bukan duplikat hex terpisah - dihitung dari `colors.primary`
//              yang sama dipakai `palette.primary.main` di bawah, supaya
//              TIDAK PERNAH bisa drift dari primary asli), 2 companion
//              melengkapi jadi triad yg serasi tapi tidak monokrom (revisi
//              dari "line1/2/3" lama: 3 hue lepas independen dari primary,
//              kadang malah tabrakan sama warna semantik).
// - `rank`   : 3 warna BERJENJANG (1 hue brand digradasi kuat→pudar) per-
//              palette (field `rank` di palettes.ts) - khusus data yang
//              punya URUTAN nilai (mis. tier Atas/Tengah/Bawah KPI4). Beda
//              dari `data` di atas: `data` = kategori lepas, `rank` = kategori
//              berjenjang - dipisah krn 3 hue lepas terasa "berisik"/tidak
//              related kalau dipakai utk data yang seharusnya kebaca sbg
//              1 skala kuat→lemah (audit 2026-08-09, task026 §8t).
// - `soft`   : tint transparan DIHITUNG dari warna solid manapun (primary/success/
//              error/data/rank/dst) via alpha(), bukan hex baru per-palette per-
//              mode. Ini yang bikin tint TIDAK PERNAH bisa mismatch dgn versi
//              solid-nya (satu sumber kebenaran) - dipakai utk background
//              card/badge lembut.
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      data: [string, string, string]
      rank: [string, string, string]
      soft: (color: string, opacity?: number) => string
    }
  }
  interface ThemeOptions {
    custom?: {
      data?: [string, string, string]
      rank?: [string, string, string]
      soft?: (color: string, opacity?: number) => string
    }
  }
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const FONT_PRIMARY = '"Plus Jakarta Sans"'
const FONT_MONO    = '"Plus Jakarta Sans"'

const BORDER_RADIUS = 10

// Warna semantik (success/warning/error/info) SENGAJA tetap sama di semua palette
// (Task003 §2.1) - cuma primary/secondary yang ikut ganti sesuai PALETTES.
// Nilai diperbarui 2026-08-09 (dokumen "Rekomendasi Paduan Warna", task026
// §8s/§8t) - success jadi emerald-600/400, error jadi rose-600/400 (bukan
// red lagi, sengaja beda hue dari brand "Executive Red" - lihat
// SEMANTIC_OVERRIDES di bawah), info jadi blue-600/400 (bukan cyan lagi).
const SEMANTIC = {
  light: { success: '#16A34A', warning: '#D97706', error: '#E11D48', info: '#2563EB' },
  dark:  { success: '#4ADE80', warning: '#FBBF24', error: '#FB7185', info: '#60A5FA' },
}

// Pengecualian tabrakan hue brand vs semantik - SATU-SATUNYA tempat semantik
// boleh beda dari SEMANTIC di atas, dan HANYA utk 2 palet yang brand-nya
// sehue dgn salah satu semantik (hijau vs success, merah vs error). Palet
// lain semantik tetap 100% seragam, prinsip Task003 tidak berubah.
const SEMANTIC_OVERRIDES: Partial<Record<PaletteKey, { light?: Partial<typeof SEMANTIC.light>; dark?: Partial<typeof SEMANTIC.dark> }>> = {
  green: { light: { success: '#15803D' } },                          // brand hijau vs success hijau
  rose:  { light: { error: '#BE123C' }, dark: { error: '#FDA4AF' } }, // brand merah vs error merah
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
  const override = SEMANTIC_OVERRIDES[paletteKey]
  const semanticLight = { ...SEMANTIC.light, ...override?.light }
  const semanticDark  = { ...SEMANTIC.dark,  ...override?.dark }

  const theme = createTheme({
    palette: {
      mode,
      primary:   { main: isDark ? colors.primary.dark   : colors.primary.light,   contrastText: '#fff' },
      secondary: { main: isDark ? colors.secondary.dark : colors.secondary.light, contrastText: '#fff' },
      success:   { main: isDark ? semanticDark.success : semanticLight.success },
      warning:   { main: isDark ? semanticDark.warning : semanticLight.warning },
      error:     { main: isDark ? semanticDark.error   : semanticLight.error },
      info:      { main: isDark ? semanticDark.info    : semanticLight.info },
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
      },
      MuiCssBaseline: {
        styleOverrides: {
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

  theme.custom = {
    data: [
      isDark ? colors.primary.dark : colors.primary.light,
      isDark ? colors.companion.secondary.dark : colors.companion.secondary.light,
      isDark ? colors.companion.tertiary.dark  : colors.companion.tertiary.light,
    ],
    rank: [
      isDark ? colors.rank.top.dark    : colors.rank.top.light,
      isDark ? colors.rank.mid.dark    : colors.rank.mid.light,
      isDark ? colors.rank.bottom.dark : colors.rank.bottom.light,
    ],
    soft: (color, opacity = 0.1) => alpha(color, opacity),
  }

  return theme
}
