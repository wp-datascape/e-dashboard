import type { TFunction } from 'i18next';

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Konversi 'YYYY-MM' (label dari trend chart) ke hari terakhir bulan sebagai 'YYYY-MM-DD' */
export function monthToEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Terjemahkan key item_type mentah ('unit'/'sparepart'/'consumable') ke label chip */
export function relabelCategory(t: TFunction) {
  return (k: string) =>
    k === 'unit' ? t('crossSelling.chipUnit') : k === 'sparepart' ? t('crossSelling.chipSparepart') : k === 'consumable' ? t('crossSelling.chipConsumable') : k;
}

export function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}
