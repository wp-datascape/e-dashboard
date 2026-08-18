// src/theme/palettes.ts
//
// Registry palette warna (Task003) — user bisa pilih salah satu dari App Settings,
// tersimpan ke akun (bukan cuma localStorage), lihat backend/src/features/auth.
//
// Cuma primary+secondary yang ikut ganti per palette. success/warning/error/info
// SENGAJA tetap tetap (hijau/kuning/merah/cyan) di semua palette, didefinisikan di
// theme/index.ts (BRAND) - supaya sinyal warna semantik tidak pernah ambigu (mis.
// "error" jangan sampai ikut jadi hijau kalau user pilih palette hijau).

export type PaletteKey = 'blue' | 'green' | 'yellow' | 'purple' | 'rose' | 'indigo'

export interface PaletteColors {
  primary: { light: string; dark: string }
  secondary: { light: string; dark: string }
  // Background khusus AppBar (bukan ikut background.paper biasa) - light mode pakai
  // warna palette penuh, dark mode versi nyaris hitam tapi tetap ada tint palette-nya
  // (bukan generic slate-900), supaya AppBar terasa "ikut palette" di kedua mode.
  appBar: { light: string; dark: string }
  // Warna highlight "warning" (mis. bar konsentrasi >25% di M3) - komplementer 180°
  // dari hue primary, S/L dinormalisasi (S>=55%, L~48-60%) supaya tetap tegas/kontras
  // di semua palette (primary yang low-saturation seperti slate kalau di-komplemen
  // apa adanya jadi coklat pudar, kurang terasa "warning").
  warningComplement: { light: string; dark: string }
  // 2 warna COMPANION per-palette (bukan 3 hue lepas independen lagi -
  // "line1/2/3" lama dibuang, lihat dokumen "Sistem Triad Warna",
  // 2026-08-09) - dikurasi desainer supaya berpasangan HARMONIS dgn
  // `primary` via 1 strategi tetap (analogous/triadic/split-complement,
  // beda per palet, lihat komentar di tiap entri PALETTES di bawah).
  // `theme.custom.data` (theme/index.ts) = [primary, companion.secondary,
  // companion.tertiary] - primary SENDIRI jadi hue data pertama (bukan
  // duplikat hex terpisah, supaya tidak pernah drift dari primary asli),
  // 2 companion di sini melengkapi jadi triad 3-hue-beda yg tidak monokrom
  // tapi tetap serasi (bukan 3 warna acak). Dipakai utk data KATEGORIKAL
  // (metrik independen satu sama lain, mis. chart M3) - beda dari `rank`
  // di bawah (data BERJENJANG/urutan nilai, tetap 1 keluarga hue).
  companion: {
    secondary: { light: string; dark: string }
    tertiary: { light: string; dark: string }
  }
  // 3 warna BERJENJANG (Atas/Tengah/Bawah, dst) per-palette - 1 keluarga hue
  // digradasi kuat→pudar (light) / terang→dalam (dark, dibalik biar seri
  // utama menonjol di latar gelap), BUKAN 3 hue lepas seperti line1/2/3 -
  // ditambahkan 2026-08-09 (dokumen "Rekomendasi Paduan Warna", task026
  // §8t) khusus utk data yang punya urutan nilai (mis. tier KPI4), diekspos
  // lewat theme.custom.rank (lihat theme/index.ts).
  rank: {
    top: { light: string; dark: string }
    mid: { light: string; dark: string }
    bottom: { light: string; dark: string }
  }
}

export const DEFAULT_PALETTE: PaletteKey = 'blue'

// Set warna baru (2026-07-25) — key internal (blue/green/yellow/purple/rose/indigo)
// SENGAJA TIDAK diganti nama/value-nya meski label tampilan & warnanya sudah beda total
// dari sebelumnya, supaya preferensi user yang sudah tersimpan di akun (kolom
// users.preferences.color_palette) TETAP VALID tanpa perlu migration/backfill. Validasi
// backend (auth.schema.ts COLOR_PALETTES) juga tidak perlu diubah karena union key-nya sama.
// Label tampilan di Settings (config.appSettings.paletteXxx) diupdate terpisah ke nama baru.
// secondary dipakai juga sebagai warna "Bar 2" di chart 2-bar (mis. ComboChartWidget
// bar2Color fallback) - nilai dari matrix warna terbaru user, sengaja SAMA utk light &
// dark mode karena warnanya sudah pastel/terang jadi kontras baik di kedua mode tanpa
// perlu lighten lagi (di-lighten lagi malah nyaris putih, jadi tidak terlihat).
export const PALETTES: Record<PaletteKey, PaletteColors> = {
  // "Enterprise Blue" - strategi analogous (companion ±30-40° dari primary)
  blue: {
    primary:   { light: '#2563EB', dark: '#5284EF' },
    secondary: { light: '#93C5FD', dark: '#93C5FD' },
    appBar:    { light: '#2563EB', dark: '#0B111E' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    companion: {
      secondary: { light: '#0EA5E9', dark: '#38BDF8' }, // sky
      tertiary:  { light: '#6366F1', dark: '#818CF8' }, // indigo
    },
  rank: {
    top:    { light: '#1D4ED8', dark: '#60A5FA' },
    mid:    { light: '#60A5FA', dark: '#3B82F6' },
    bottom: { light: '#BFDBFE', dark: '#1E40AF' },
  },
  },
  // "Executive Green" - strategi split-complement (companion +150°/+210°)
  green: {
    primary:   { light: '#059669', dark: '#06C689' },
    secondary: { light: '#6EE7B7', dark: '#6EE7B7' },
    appBar:    { light: '#059669', dark: '#0B1E18' },
    warningComplement: { light: '#FBBF24 ', dark: '#FBBF24 ' },
    companion: {
      secondary: { light: '#0D9488', dark: '#2DD4BF' }, // teal
      tertiary:  { light: '#65A30D', dark: '#A3E635' }, // lime
    },
    rank: {
      top:    { light: '#15803D', dark: '#4ADE80' },
      mid:    { light: '#4ADE80', dark: '#22C55E' },
      bottom: { light: '#BBF7D0', dark: '#166534' },
    },
  },
  // "Modern Teal" (key internal tetap 'yellow' - lihat catatan di atas) -
  // strategi triadic (companion +120°/+240°)
  yellow: {
    primary:   { light: '#0F766E', dark: '#15A297' },
    secondary: { light: '#99F6E4', dark: '#99F6E4' },
    appBar:    { light: '#0F766E', dark: '#0B1E1C' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    companion: {
      secondary: { light: '#0891B2', dark: '#22D3EE' }, // cyan
      tertiary:  { light: '#7C3AED', dark: '#A78BFA' }, // violet
    },
    rank: {
      top:    { light: '#0F766E', dark: '#2DD4BF' },
      mid:    { light: '#5EEAD4', dark: '#14B8A6' },
      bottom: { light: '#99F6E4', dark: '#0F766E' },
    },
  },
  // "Premium Purple" - strategi triadic (companion +120°/+240°)
  purple: {
    primary:   { light: '#7C3AED', dark: '#9B6AF1' },
    secondary: { light: '#C4B5FD', dark: '#C4B5FD' },
    appBar:    { light: '#7C3AED', dark: '#120B1E' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    companion: {
      secondary: { light: '#DB2777', dark: '#F472B6' }, // pink
      tertiary:  { light: '#2563EB', dark: '#60A5FA' }, // biru
    },
    rank: {
      top:    { light: '#6D28D9', dark: '#A78BFA' },
      mid:    { light: '#A78BFA', dark: '#8B5CF6' },
      bottom: { light: '#DDD6FE', dark: '#5B21B6' },
    },
  },
  // "Executive Red" (key internal tetap 'rose' - lihat catatan di atas) -
  // strategi analogous (companion ±30-40° dari primary)
  rose: {
    primary:   { light: '#DC2626', dark: '#E35454' },
    secondary: { light: '#FCA5A5', dark: '#FCA5A5' },
    appBar:    { light: '#DC2626', dark: '#1E0B0B' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    companion: {
      secondary: { light: '#EA580C', dark: '#FB923C' }, // oranye
      tertiary:  { light: '#B45309', dark: '#FBBF24' }, // amber
    },
    rank: {
      top:    { light: '#B91C1C', dark: '#F87171' },
      mid:    { light: '#F87171', dark: '#EF4444' },
      bottom: { light: '#FECACA', dark: '#991B1B' },
    },
  },
  // "Enterprise Slate" (key internal tetap 'indigo' - lihat catatan di atas)
  // - strategi slate + companion dingin (sky/teal, senada nuansa netral-nya)
  indigo: {
    primary:   { light: '#475569', dark: '#5D6F89' },
    secondary: { light: '#CBD5E1', dark: '#CBD5E1' },
    appBar:    { light: '#475569', dark: '#0B131E' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    companion: {
      secondary: { light: '#0EA5E9', dark: '#38BDF8' }, // sky
      tertiary:  { light: '#14B8A6', dark: '#2DD4BF' }, // teal
    },
    rank: {
      top:    { light: '#334155', dark: '#94A3B8' },
      mid:    { light: '#94A3B8', dark: '#64748B' },
      bottom: { light: '#CBD5E1', dark: '#475569' },
    },
  },
}

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[]

export function isPaletteKey(value: string): value is PaletteKey {
  return value in PALETTES
}
