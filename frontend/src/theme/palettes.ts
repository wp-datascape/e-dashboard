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
  // Warna 3 line di chart M3 (Actual/Avg, Median, Kontribusi High Margin) - tiap
  // line dipilih kontras terhadap warna bar (primary) & terhadap satu sama lain.
  line1: { light: string; dark: string }
  line2: { light: string; dark: string }
  line3: { light: string; dark: string }
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
  // "Enterprise Blue"
  blue: {
    primary:   { light: '#2563EB', dark: '#5284EF' },
    secondary: { light: '#93C5FD', dark: '#93C5FD' },
    appBar:    { light: '#2563EB', dark: '#0B111E' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    line1: { light: '#06B6D4', dark: '#22D3EE' },
    line2: { light: '#EC4899', dark: '#F472B6' },
    line3: { light: '#8B5CF6', dark: '#A78BFA' },
  },
  // "Executive Green"
  green: {
    primary:   { light: '#059669', dark: '#06C689' },
    secondary: { light: '#6EE7B7', dark: '#6EE7B7' },
    appBar:    { light: '#059669', dark: '#0B1E18' },
    warningComplement: { light: '#FBBF24', dark: '#FBBF24' },
    line1: { light: '#3B82F6', dark: '#60A5FA' },
    line2: { light: '#EC4899', dark: '#F472B6' },
    line3: { light: '#8B5CF6', dark: '#A78BFA' },
  },
  // "Modern Teal" (key internal tetap 'yellow' - lihat catatan di atas)
  yellow: {
    primary:   { light: '#0F766E', dark: '#15A297' },
    secondary: { light: '#99F6E4', dark: '#99F6E4' },
    appBar:    { light: '#0F766E', dark: '#0B1E1C' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    line1: { light: '#6366F1', dark: '#9395F6' },
    line2: { light: '#06B6D4', dark: '#22D3EE' },
    line3: { light: '#E11D48', dark: '#E84A6C' },
  },
  // "Premium Purple"
  purple: {
    primary:   { light: '#7C3AED', dark: '#9B6AF1' },
    secondary: { light: '#C4B5FD', dark: '#C4B5FD' },
    appBar:    { light: '#7C3AED', dark: '#120B1E' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    line1: { light: '#14B8A6', dark: '#19E6CE' },
    line2: { light: '#3B82F6', dark: '#60A5FA' },
    line3: { light: '#EF4444', dark: '#F37272' },
  },
  // "Executive Red" (key internal tetap 'rose' - lihat catatan di atas)
  rose: {
    primary:   { light: '#DC2626', dark: '#E35454' },
    secondary: { light: '#FCA5A5', dark: '#FCA5A5' },
    appBar:    { light: '#DC2626', dark: '#1E0B0B' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    line1: { light: '#2563EB', dark: '#5284EF' },
    line2: { light: '#10B981', dark: '#14E6A0' },
    line3: { light: '#8B5CF6', dark: '#A78BFA' },
  },
  // "Enterprise Slate" (key internal tetap 'indigo' - lihat catatan di atas)
  indigo: {
    primary:   { light: '#475569', dark: '#5D6F89' },
    secondary: { light: '#CBD5E1', dark: '#CBD5E1' },
    appBar:    { light: '#475569', dark: '#0B131E' },
    warningComplement: { light: '#F59E0B', dark: '#F59E0B' },
    line1: { light: '#2563EB', dark: '#6DA2F8' },
    line2: { light: '#14B8A6', dark: '#19E6CE' },
    line3: { light: '#E11D48', dark: '#F472B6' },
  },
}

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[]

export function isPaletteKey(value: string): value is PaletteKey {
  return value in PALETTES
}
