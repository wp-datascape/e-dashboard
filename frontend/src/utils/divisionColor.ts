// Division sekarang dinamis per company (task012 v2, tidak ada lagi 6 key tetap),
// jadi warna chip tidak bisa lagi lookup table statis — dulu semua chip division
// jatuh ke 'default' (tidak berwarna) karena data yang lewat sekarang label
// bebas dari admin ("Distribution", custom apa pun), bukan key enum lama
// ('distribution', dst) yang jadi acuan lookup table itu. Hash deterministik atas
// string (key atau label) supaya warna tetap konsisten antar reload untuk division
// yang sama, tanpa perlu daftar key yang di-maintain manual.
const DIVISION_CHIP_COLORS = ['primary', 'info', 'success', 'warning', 'error'] as const

export type DivisionChipColor = (typeof DIVISION_CHIP_COLORS)[number] | 'default'

export function getDivisionColor(value: string | null | undefined): DivisionChipColor {
  if (!value) return 'default'
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return DIVISION_CHIP_COLORS[Math.abs(hash) % DIVISION_CHIP_COLORS.length]
}
