/**
 * utils/chunkLoadError.ts
 *
 * Deteksi error "gagal fetch chunk JS lazy-loaded" — kejadian setelah deploy baru:
 * bundle yang sedang jalan di browser masih referensi nama file chunk versi LAMA
 * (hash berubah tiap build), tapi server/CDN cuma nyimpan file build TERBARU.
 * User yang tab-nya sudah lama terbuka lalu klik ke halaman yang belum pernah
 * dimuat (React.lazy) akan dapat network error 404 saat itu juga — sampai
 * sekarang cuma tertangkap ErrorBoundary generik & user harus reload manual.
 *
 * Pesan error beda-beda per browser (semua browser modern lempar TypeError,
 * pesannya yang beda):
 * - Chromium: "Failed to fetch dynamically imported module: <url>"
 * - Firefox:  "error loading dynamically imported module: <url>"
 * - Safari:   "Importing a module script failed"
 */

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
]

export function isChunkLoadError(error: Error): boolean {
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(error.message))
}

/**
 * sessionStorage key — dipasang SEBELUM reload otomatis, dibersihkan beberapa detik
 * setelah boot sukses (lihat main.tsx). Kalau reload otomatis TERNYATA masih kena
 * chunk error lagi (server benar-benar down, bukan cuma stale cache), flag ini masih
 * ada → ErrorBoundary tidak reload lagi (cegah infinite reload loop), fallback ke
 * layar error manual biasa.
 */
export const CHUNK_RELOAD_FLAG = 'chunk-reload-attempted'
