// src/theme/palettes.ts
//
// Registry palette warna (Task003) — user bisa pilih salah satu dari App Settings,
// tersimpan ke akun (bukan cuma localStorage), lihat backend/src/features/auth.
//
// Cuma primary+secondary yang ikut ganti per palette. success/warning/error/info
// SENGAJA tetap tetap (hijau/kuning/merah/cyan) di semua palette, didefinisikan di
// theme/index.ts (BRAND) - supaya sinyal warna semantik tidak pernah ambigu (mis.
// "error" jangan sampai ikut jadi hijau kalau user pilih palette hijau).

export type PaletteKey = 'blue' | 'green' | 'yellow'

export interface PaletteColors {
  primary: { light: string; dark: string }
  secondary: { light: string; dark: string }
  // Background khusus AppBar (bukan ikut background.paper biasa) - light mode pakai
  // warna palette penuh, dark mode versi nyaris hitam tapi tetap ada tint palette-nya
  // (bukan generic slate-900), supaya AppBar terasa "ikut palette" di kedua mode.
  appBar: { light: string; dark: string }
}

export const DEFAULT_PALETTE: PaletteKey = 'blue'

export const PALETTES: Record<PaletteKey, PaletteColors> = {
  // Default - nilai sama persis dengan BRAND lama di index.ts, supaya user existing
  // (belum pernah pilih palette) tampilannya tidak berubah sama sekali.
  blue: {
    primary:   { light: '#2563EB', dark: '#3B82F6' }, // blue-600 / blue-500
    secondary: { light: '#7C3AED', dark: '#8B5CF6' }, // violet-600 / violet-500
    appBar:    { light: '#2563EB', dark: '#0B1220' }, // blue-600 / nyaris hitam ber-tint biru
  },
  green: {
    primary:   { light: '#16A34A', dark: '#22C55E' }, // green-600 / green-500
    secondary: { light: '#0D9488', dark: '#14B8A6' }, // teal-600 / teal-500
    appBar:    { light: '#16A34A', dark: '#0B1710' }, // green-600 / nyaris hitam ber-tint hijau
  },
  yellow: {
    primary:   { light: '#D97706', dark: '#F59E0B' }, // amber-600 / amber-500
    secondary: { light: '#EA580C', dark: '#FB923C' }, // orange-600 / orange-400
    appBar:    { light: '#D97706', dark: '#1A1207' }, // amber-600 / nyaris hitam ber-tint amber
  },
}

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[]

export function isPaletteKey(value: string): value is PaletteKey {
  return value in PALETTES
}
