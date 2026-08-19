import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';

// Header KPI (task029.md §28.2) — Current / YoY / Change, dipusatkan
// supaya semua KPI (M1-M10) pakai layout & aturan format yang sama.
// TANPA card/border (2026-08-19, koreksi user — sempat mau diganti ke
// card, dibatalkan: "perbaiki tanpa card dulu, tapi peletakannya
// disesuaikan") — perbaikannya di hierarki visual & spacing, bukan
// nambah bingkai: Current jadi paling menonjol (font lebih besar),
// divider vertikal tipis misahin tiap kolom, ikon trend (⬆/⬇, pola sama
// dgn StatCard.tsx) di angka Change, gap dilebarkan, dan sub-label
// "vs <periode>" di YoY biar user tahu dibanding apa (temuan review UX
// user 2026-08-19).
export type KpiType = 'value' | 'rate' | 'count';

interface KpiHeaderProps {
  current: number;
  yoy: number;
  kpiType: KpiType;
  /** Format angka Current/YoY (Rp/jumlah) — tidak dipakai utk kpiType 'rate' (selalu %) */
  formatValue?: (v: number) => string;
  /** Label periode pembanding YoY, mis. "Agu 2025" — ditampilkan sbg sub-label kecil */
  comparisonLabel?: string;
}

export function KpiHeader({ current, yoy, kpiType, formatValue, comparisonLabel }: KpiHeaderProps) {
  const { t } = useTranslation();
  const fmt = formatValue ?? ((v: number) => v.toLocaleString('id-ID'));

  const currentLabel = kpiType === 'rate' ? `${current.toFixed(1)}%` : fmt(current);
  const yoyLabel = kpiType === 'rate' ? `${yoy.toFixed(1)}%` : fmt(yoy);

  let changeLabel: string;
  let direction: 'up' | 'down' | 'flat';
  if (kpiType === 'rate') {
    // Percentage point, BUKAN relative % (task029.md §20/§28.2) — hindari
    // rancu antara growth relatif dan perubahan pp.
    const pp = current - yoy;
    changeLabel = `${pp >= 0 ? '+' : ''}${pp.toFixed(1)}pp`;
    direction = pp > 0 ? 'up' : pp < 0 ? 'down' : 'flat';
  } else {
    const diff = current - yoy;
    const pct = yoy !== 0 ? (diff / yoy) * 100 : 0;
    changeLabel = `${diff >= 0 ? '+' : ''}${fmt(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
    direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  }
  const changeColor = direction === 'up' ? 'success.main' : direction === 'down' ? 'error.main' : 'text.secondary';
  const TrendIcon = direction === 'up' ? TrendingUpIcon : direction === 'down' ? TrendingDownIcon : RemoveIcon;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: { xs: 2.5, sm: 4 }, mb: 1.5 }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('dashboard.kpiHeader.current')}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{currentLabel}</Typography>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('dashboard.kpiHeader.yoy')}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.secondary' }}>{yoyLabel}</Typography>
        {comparisonLabel && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
            {t('dashboard.kpiHeader.vsPeriod', { period: comparisonLabel })}
          </Typography>
        )}
      </Box>

      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('dashboard.kpiHeader.change')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <TrendIcon sx={{ fontSize: 18, color: changeColor }} />
          <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2, color: changeColor }}>{changeLabel}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
