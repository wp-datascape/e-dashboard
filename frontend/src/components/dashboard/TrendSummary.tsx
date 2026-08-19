import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

// Trend Summary (task029.md §28.6) — 12M Average / Highest / Lowest,
// dihitung dari SELURUH titik trend yang tampil di chart (bukan diam-diam
// ambil 1 titik terakhir — itu larangan eksplisit §28.6). Dipusatkan
// supaya M1-M10 pakai perhitungan & layout yang sama. TANPA card
// (2026-08-19, sama spt KpiHeader) — dipisah pakai divider vertikal +
// gap lebih lega, bukan bingkai, sesuai perbaikan tata letak yang
// diminta user tanpa nambah card.
interface TrendSummaryProps<T> {
  data: T[];
  accessor: (row: T) => number;
  labelAccessor: (row: T) => string;
  formatValue: (v: number) => string;
}

export function TrendSummary<T>({ data, accessor, labelAccessor, formatValue }: TrendSummaryProps<T>) {
  const { t } = useTranslation();
  if (data.length === 0) return null;

  const values = data.map(accessor);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  let highestIdx = 0;
  let lowestIdx = 0;
  values.forEach((v, i) => {
    if (v > values[highestIdx]) highestIdx = i;
    if (v < values[lowestIdx]) lowestIdx = i;
  });

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: { xs: 2.5, sm: 4 }, mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('dashboard.trendSummary.average', { count: data.length })}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatValue(average)}</Typography>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('dashboard.trendSummary.highest')}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatValue(values[highestIdx])}</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>{labelAccessor(data[highestIdx])}</Typography>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('dashboard.trendSummary.lowest')}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatValue(values[lowestIdx])}</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>{labelAccessor(data[lowestIdx])}</Typography>
      </Box>
    </Box>
  );
}
