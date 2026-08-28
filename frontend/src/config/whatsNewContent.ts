// Daftar konten halaman "Info & Panduan" (task033) - statis dari kode, sama
// seperti config/announcements.ts (task032): nambah entry baru cukup tambah
// 1 baris di sini + teks di i18n/locales/{id,en}/whatsnew.json (+ file
// Markdown di i18n/locales/{id,en}/guides/ untuk Guides), TANPA ubah
// komponen halaman.
//
// `key` dipakai sebagai lookup ke i18n (mis. `whatsnew.items.${key}.title`)
// - HARUS sama persis dengan key yang ada di whatsnew.json.

export type WhatsNewCategory = 'new' | 'improved' | 'fixed'

export interface WhatsNewItem {
  key: string
  category: WhatsNewCategory
  /** Tanggal rilis, format ISO (yyyy-mm-dd) - diverifikasi dari git log, bukan tebakan. */
  date: string
  /** CTA navigasi ke halaman lain. Saling eksklusif dengan ctaGuideKey. */
  ctaTo?: string
  /** CTA buka dialog detail Guide (referensi `key` di GUIDES di bawah) -
   * dipakai kalau kontennya berupa instruksi/panduan, bukan halaman untuk
   * dikunjungi (mis. cara install PWA). Saling eksklusif dengan ctaTo. */
  ctaGuideKey?: string
}

export interface GuideItem {
  key: string
  /** Nama file Markdown (tanpa ekstensi) di i18n/locales/{id,en}/guides/. */
  slug: string
}

export interface TipItem {
  key: string
}

export interface FeatureGroup {
  key: string
  /** Path halaman pertama di grup ini, dipakai sebagai tujuan klik. */
  to: string
}

// Urutan array = urutan tampil - PWA sengaja ditaruh PALING ATAS (instruksi
// eksplisit user: "salah 1 fitur yang harus di blow up" adalah PWA), meski
// tanggal rilisnya (git log) lebih lama dari entri lain - kapabilitas ini
// belum pernah diberitahukan ke user sebelumnya di halaman mana pun.
//
// 'pareto' (Customer Pareto, halaman /analisis) DIHAPUS dari sini (2026-08-28,
// koreksi keras user: "kenapa disebut di whats new jika menu tidak ada atau
// deadcode") - route-nya masih ada, TAPI tidak ada link sidebar sama sekali
// sejak restrukturisasi menu task029, jadi menyebutnya di sini menyesatkan
// (user diarahkan ke fitur yang tidak bisa dijangkau). JANGAN ditambahkan
// lagi sampai halaman itu benar-benar punya jalan masuk dari navigasi.
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  { key: 'pwa', category: 'new', date: '2026-07-03', ctaGuideKey: 'install-pwa' },
  { key: 'help-page', category: 'new', date: '2026-08-27', ctaTo: '/help' },
  { key: 'reports', category: 'new', date: '2026-08-26', ctaTo: '/report/growth' },
  { key: 'upsell-targets', category: 'improved', date: '2026-08-26', ctaGuideKey: 'find-upsell' },
  { key: 'cross-sell-heatmap', category: 'new', date: '2026-07-24', ctaTo: '/growth' },
  { key: 'period-filter', category: 'improved', date: '2026-08-22', ctaTo: '/growth' },
  { key: 'mobile', category: 'improved', date: '2026-08-24' },
]

export const GUIDES: GuideItem[] = [
  { key: 'install-pwa', slug: 'install-pwa' },
  { key: 'find-upsell', slug: 'find-upsell' },
  { key: 'accent-color', slug: 'accent-color' },
  { key: 'period-type', slug: 'period-type' },
  { key: 'exclude-intercompany', slug: 'exclude-intercompany' },
  { key: 'find-definition', slug: 'find-definition' },
]

export const TIPS: TipItem[] = [
  { key: 'period-choice' },
  { key: 'dormant-value' },
  { key: 'cross-sell' },
]

export const FEATURE_GROUPS: FeatureGroup[] = [
  { key: 'business', to: '/growth' },
  { key: 'data', to: '/customers' },
  { key: 'report', to: '/report/growth' },
  { key: 'help', to: '/help' },
]
