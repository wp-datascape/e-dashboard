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
}

export const DEFAULT_PALETTE: PaletteKey = 'blue'

// Set warna baru (2026-07-25) — key internal (blue/green/yellow/purple/rose/indigo)
// SENGAJA TIDAK diganti nama/value-nya meski label tampilan & warnanya sudah beda total
// dari sebelumnya, supaya preferensi user yang sudah tersimpan di akun (kolom
// users.preferences.color_palette) TETAP VALID tanpa perlu migration/backfill. Validasi
// backend (auth.schema.ts COLOR_PALETTES) juga tidak perlu diubah karena union key-nya sama.
// Label tampilan di Settings (config.appSettings.paletteXxx) diupdate terpisah ke nama baru.
export const PALETTES: Record<PaletteKey, PaletteColors> = {
  // "Enterprise Blue"
  blue: {
    primary:   { light: '#2563EB', dark: '#5284EF' },
    secondary: { light: '#7C3AED', dark: '#8B5CF6' },
    appBar:    { light: '#2563EB', dark: '#0B111E' },
  },
  // "Executive Green"
  green: {
    primary:   { light: '#059669', dark: '#06C689' },
    secondary: { light: '#0891B2', dark: '#06B6D4' },
    appBar:    { light: '#059669', dark: '#0B1E18' },
  },
  // "Modern Teal" (key internal tetap 'yellow' - lihat catatan di atas)
  yellow: {
    primary:   { light: '#0F766E', dark: '#15A297' },
    secondary: { light: '#0284C7', dark: '#0EA5E9' },
    appBar:    { light: '#0F766E', dark: '#0B1E1C' },
  },
  // "Premium Purple"
  purple: {
    primary:   { light: '#7C3AED', dark: '#9B6AF1' },
    secondary: { light: '#C026D3', dark: '#D946EF' },
    appBar:    { light: '#7C3AED', dark: '#120B1E' },
  },
  // "Executive Red" (key internal tetap 'rose' - lihat catatan di atas)
  rose: {
    primary:   { light: '#DC2626', dark: '#E35454' },
    secondary: { light: '#DB2777', dark: '#EC4899' },
    appBar:    { light: '#DC2626', dark: '#1E0B0B' },
  },
  // "Enterprise Slate" (key internal tetap 'indigo' - lihat catatan di atas)
  indigo: {
    primary:   { light: '#475569', dark: '#5D6F89' },
    secondary: { light: '#64748B', dark: '#94A3B8' },
    appBar:    { light: '#475569', dark: '#0B131E' },
  },
}

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[]

export function isPaletteKey(value: string): value is PaletteKey {
  return value in PALETTES
}
