import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

// Header KPI (task029.md §28.2) — Current / YoY / Change, dipusatkan
// supaya semua KPI (M1-M10) pakai layout & aturan format yang sama.
// Sengaja SEMINIMALIS mungkin (baris tipis, bukan kartu besar spt draft
// ASCII §28.2/§28.11) — instruksi user 2026-08-19: "sesuaikan dengan
// chart yang ada saat ini", pola halaman existing (M3Revenue dkk) tidak
// punya kartu besar sama sekali, cuma SectionLabel + chart langsung.
export type KpiType = 'value' | 'rate' | 'count';

interface KpiHeaderProps {
  current: number;
  yoy: number;
  kpiType: KpiType;
  /** Format angka Current/YoY (Rp/jumlah) — tidak dipakai utk kpiType 'rate' (selalu %) */
  formatValue?: (v: number) => string;
}

export function KpiHeader({ current, yoy, kpiType, formatValue }: KpiHeaderProps) {
  const { t } = useTranslation();
  const fmt = formatValue ?? ((v: number) => v.toLocaleString('id-ID'));

  const currentLabel = kpiType === 'rate' ? `${current.toFixed(1)}%` : fmt(current);
  const yoyLabel = kpiType === 'rate' ? `${yoy.toFixed(1)}%` : fmt(yoy);

  let changeLabel: string;
  let changeColor: 'success.main' | 'error.main' | 'text.secondary';
  if (kpiType === 'rate') {
    // Percentage point, BUKAN relative % (task029.md §20/§28.2) — hindari
    // rancu antara growth relatif dan perubahan pp.
    const pp = current - yoy;
    changeLabel = `${pp >= 0 ? '+' : ''}${pp.toFixed(1)}pp`;
    changeColor = pp > 0 ? 'success.main' : pp < 0 ? 'error.main' : 'text.secondary';
  } else {
    const diff = current - yoy;
    const pct = yoy !== 0 ? (diff / yoy) * 100 : 0;
    changeLabel = `${diff >= 0 ? '+' : ''}${fmt(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
    changeColor = diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.secondary';
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, sm: 3 }, mb: 1 }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('dashboard.kpiHeader.current')}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{currentLabel}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('dashboard.kpiHeader.yoy')}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3, color: 'text.secondary' }}>{yoyLabel}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('dashboard.kpiHeader.change')}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3, color: changeColor }}>{changeLabel}</Typography>
      </Box>
    </Box>
  );
}
