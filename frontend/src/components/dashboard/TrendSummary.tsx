import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

// Trend Summary (task029.md §28.6) — Average/Highest/Lowest, dihitung dari
// SELURUH titik trend yang tampil di chart (bukan diam-diam ambil 1 titik
// terakhir — larangan eksplisit §28.6).
//
// 2026-08-19, iterasi ke-5: dipadatkan jadi 1 baris — judul section di
// atas (nyebut metrik + jumlah bulan, TIDAK diulang lagi di tiap item),
// lalu SATU baris "Label: Value | Label: Value | Label: Value" dipisah
// pipe (sama pola dgn KpiHeader). Spasi judul ke baris key:value diperkecil.
interface TrendSummaryProps<T> {
  /** Nama KPI, mis. "Cross-Sell Rate" — dipakai di judul section (bukan diulang di tiap item lagi). */
  metricLabel: string;
  data: T[];
  accessor: (row: T) => number;
  labelAccessor: (row: T) => string;
  formatValue: (v: number) => string;
  /** Kata satuan periode ("bulan"/"kuartal"/"semester"/"tahun", task029.md §30,
   * 2026-08-20) — default "bulan" (dashboard.periodUnit.monthly) kalau caller
   * belum granularitas-aware. */
  unit?: string;
}

function Item({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, whiteSpace: 'nowrap' }}>
      <Typography component="span" variant="body2" color="text.secondary">{label}:</Typography>
      <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
      {sub && <Typography component="span" variant="caption" color="text.disabled">({sub})</Typography>}
    </Box>
  );
}

export function TrendSummary<T>({ metricLabel, data, accessor, labelAccessor, formatValue, unit }: TrendSummaryProps<T>) {
  const { t } = useTranslation();
  if (data.length === 0) return null;
  const resolvedUnit = unit ?? t('dashboard.periodUnit.monthly');

  const values = data.map(accessor);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  let highestIdx = 0;
  let lowestIdx = 0;
  values.forEach((v, i) => {
    if (v > values[highestIdx]) highestIdx = i;
    if (v < values[lowestIdx]) lowestIdx = i;
  });

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.25 }}>
        {t('dashboard.trendSummary.sectionLabel', { metric: metricLabel, count: data.length, unit: resolvedUnit })}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
        <Item label={t('dashboard.trendSummary.average')} value={formatValue(average)} />
        <Typography color="text.disabled">|</Typography>
        <Item label={t('dashboard.trendSummary.highest')} value={formatValue(values[highestIdx])} sub={labelAccessor(data[highestIdx])} />
        <Typography color="text.disabled">|</Typography>
        <Item label={t('dashboard.trendSummary.lowest')} value={formatValue(values[lowestIdx])} sub={labelAccessor(data[lowestIdx])} />
      </Box>
    </Box>
  );
}
