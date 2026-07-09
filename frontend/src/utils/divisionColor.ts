// frontend/src/utils/divisionColor.ts
import type { StatusChipColor } from '@/components/ui/StatusChip'

// Kode divisi tidak bisa lagi di-pre-enumerasi (dinamis per company/branch,
// lihat docs-v2/task/task004.md) — warna chip untuk kode baru (mis. "counter"
// milik KNT, "sales"/"marketing" milik SKI) dihitung deterministik dari hash
// string, bukan lookup map tetap. 6 kode asli MKO tetap pakai warna lama biar
// tidak ada perubahan visual buat user existing (task005 Session D).
const KNOWN_COLORS: Record<string, StatusChipColor> = {
  distribution: 'primary',
  project: 'info',
  e_commerce: 'success',
  intercompany: 'warning',
  freelancer: 'error',
  support: 'default',
}

// 'default' sengaja tidak masuk pool hash — direservasi utk kode kosong/null,
// supaya kode baru selalu dapat warna yang jelas kelihatan (bukan abu-abu netral).
const HASH_COLOR_POOL: StatusChipColor[] = ['primary', 'success', 'warning', 'error', 'info']

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Warna chip deterministik per kode divisi — konsisten dipanggil dari mana pun untuk kode yang sama. */
export function getDivisionColor(code: string | null | undefined): StatusChipColor {
  if (!code) return 'default'
  if (code in KNOWN_COLORS) return KNOWN_COLORS[code]
  return HASH_COLOR_POOL[hashString(code) % HASH_COLOR_POOL.length]
}
