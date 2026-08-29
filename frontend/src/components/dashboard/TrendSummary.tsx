import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';

// Trend Summary (task029.md §28.6) — Average/Highest/Lowest, dihitung dari
// SELURUH titik trend yang tampil di chart (bukan diam-diam ambil 1 titik
// terakhir — larangan eksplisit §28.6).
//
// 2026-08-22, iterasi ke-6 (koreksi user, mockup — sama seperti
// KpiHeader.tsx): dari 1 baris teks jadi card — judul + subjudul di atas,
// 3 angka besar berdampingan (Rata-rata/Tertinggi/Terendah). Pakai `Card`
// atomic (`@/components/ui/Card`, SAMA dipakai StatCard/SummaryCard/dkk
// di seluruh app) — TIDAK ada styling border/shadow/radius baru ditulis
// di sini (percobaan pertama pakai `Paper` mentah + `borderRadius`/
// `boxShadow` custom sendiri SALAH, ditegur user: "kenapa card nya beda
// dengan yang lain? padahal componennya atomic" — lihat KpiHeader.tsx).
interface TrendSummaryProps<T> {
  /** Nama KPI, mis. "Cross-Sell Rate" — jadi judul card. */
  metricLabel: string;
  data: T[];
  accessor: (row: T) => number;
  labelAccessor: (row: T) => string;
  formatValue: (v: number) => string;
  /** Kata satuan periode ("bulan"/"kuartal"/"semester"/"tahun", task029.md §30,
   * 2026-08-20) — default "bulan" (dashboard.periodUnit.monthly) kalau caller
   * belum granularitas-aware. */
  unit?: string;
  /** 2026-08-22 (instruksi user: "1 layout dengan chart cross selling
   * sebagai header chart... card dibawah chart jadikan footer chart" —
   * merujuk §28.11 "Struktur Final Setiap KPI Card": 1 Card berisi
   * header+chart+footer, dipisah Divider, BUKAN card terpisah-pisah).
   * `bare=true`: skip `<Card>` pembungkus + margin-top sendiri — dipakai
   * sbg footer DI DALAM Card lain (caller yang kasih Divider+padding). */
  bare?: boolean;
}

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
          ({sub})
        </Typography>
      )}
    </Box>
  );
}

export function TrendSummary<T>({ metricLabel, data, accessor, labelAccessor, formatValue, unit, bare = false }: TrendSummaryProps<T>) {
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

  const content = (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {metricLabel}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {t('dashboard.trendSummary.periodSubtitle', { count: data.length, unit: resolvedUnit })}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 3, sm: 5 }, flexWrap: 'wrap' }}>
        <Stat value={formatValue(average)} label={t('dashboard.trendSummary.average')} />
        <Stat value={formatValue(values[highestIdx])} label={t('dashboard.trendSummary.highest')} sub={labelAccessor(data[highestIdx])} />
        <Stat value={formatValue(values[lowestIdx])} label={t('dashboard.trendSummary.lowest')} sub={labelAccessor(data[lowestIdx])} />
      </Box>
    </>
  );

  if (bare) return <Box sx={{ textAlign: 'center' }}>{content}</Box>;

  return (
    <Card sx={{ mt: 2, p: 2.5, textAlign: 'center' }}>
      {content}
    </Card>
  );
}
