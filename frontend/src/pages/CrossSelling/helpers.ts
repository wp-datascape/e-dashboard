import type { TFunction } from 'i18next';

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// monthToEndDate ('YYYY-MM' -> akhir bulan) dihapus 2026-08-20 — satu-satunya
// pemakai (M2AvgCategory drill-down onAreaClick) pindah ke getPeriodRange
// (@/utils/analisisPeriod, task029.md §30) yang generalized ke 4 granularitas
// (monthly/quarter/semester/annual), bukan cuma bulanan.

// item_type dari DB bervariasi per company (2026-08-21 — KNT punya 6 tipe
// termasuk 'card'/'accesories'/'software', bukan cuma 3 spt MKO, lihat
// task029.md §28.10). Map di sini SEMUA yang sudah ketemu di data — key lain
// yang belum terdaftar tetap fallback tampil apa adanya (raw), bukan error.
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  unit: 'crossSelling.chipUnit',
  sparepart: 'crossSelling.chipSparepart',
  consumable: 'crossSelling.chipConsumable',
  card: 'crossSelling.chipCard',
  accesories: 'crossSelling.chipAccesories',
  software: 'crossSelling.chipSoftware',
};

/** Terjemahkan key item_type mentah ('unit'/'card'/'accesories'/dst) ke label chip */
export function relabelCategory(t: TFunction) {
  return (k: string) => (CATEGORY_LABEL_KEYS[k] ? t(CATEGORY_LABEL_KEYS[k]) : k);
}

// fmtRp (singkatan jt/M) dihapus 2026-08-19 — satu-satunya pemakai (M2AvgCategory,
// kolom tabel) pindah ke formatRupiah (@/utils/format, angka penuh) untuk keterbacaan.
