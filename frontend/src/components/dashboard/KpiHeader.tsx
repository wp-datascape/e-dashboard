import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';

// Header KPI (task029.md §28.2) — Current / YoY / Change.
//
// 2026-08-19, iterasi ke-5: dipadatkan jadi 1 baris — judul section di
// atas (nyebut nama metrik + periode pembanding, jadi TIDAK perlu diulang
// lagi di tiap item), lalu SATU baris "Label: Value | Label: Value |
// Label: Value" dipisah pipe, bukan 3 kolom stacked label-di-atas-value
// lagi (user: "1 baris maksudnya... Key: value | key: value | key:
// value"). Spasi judul ke baris key:value diperkecil.
export type KpiType = 'value' | 'rate' | 'count';

interface KpiHeaderProps {
  /** Nama KPI, mis. "Cross-Sell Rate" — dipakai di judul section (bukan diulang di tiap item lagi). */
  metricLabel: string;
  current: number;
  yoy: number;
  kpiType: KpiType;
  formatValue?: (v: number) => string;
  /** Label periode SAAT INI, mis. "Kuartal 3 Tahun 2026" — WAJIB eksplisit
   * (koreksi user 2026-08-21: "jangan pakai 'periode ini', harus keterangan
   * eksplisit" — dulu judul section pakai teks generik "periode ini", tidak
   * bilang periode yang mana). */
  currentPeriodLabel: string;
  /** Label periode pembanding YoY, mis. "Kuartal 2 Tahun 2025" */
  comparisonLabel: string;
}

function Item({ label, value, valueColor, icon: Icon }: { label: string; value: string; valueColor?: string; icon?: React.ElementType }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, whiteSpace: 'nowrap' }}>
      <Typography component="span" variant="body2" color="text.secondary">{label}:</Typography>
      {Icon && <Icon sx={{ fontSize: 16, color: valueColor }} />}
      <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: valueColor }}>{value}</Typography>
    </Box>
  );
}

export function KpiHeader({ metricLabel, current, yoy, kpiType, formatValue, currentPeriodLabel, comparisonLabel }: KpiHeaderProps) {
  const { t } = useTranslation();
  const fmt = formatValue ?? ((v: number) => v.toLocaleString('id-ID'));

  const currentLabel = kpiType === 'rate' ? `${current.toFixed(1)}%` : fmt(current);
  const yoyLabel = kpiType === 'rate' ? `${yoy.toFixed(1)}%` : fmt(yoy);

  let changeLabel: string;
  let direction: 'up' | 'down' | 'flat';
  if (kpiType === 'rate') {
    // Percentage point, BUKAN relative % (task029.md §20/§28.2). Dieja
    // penuh "poin persentase" — BUKAN singkatan "pp" (user 2026-08-19:
    // "PP di summary itu apa? Jangan disingkat").
    const pp = current - yoy;
    changeLabel = t('dashboard.kpiHeader.ppValue', { value: `${pp >= 0 ? '+' : ''}${pp.toFixed(1)}` });
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
    <Box sx={{ mb: 2, textAlign: 'center' }}>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.25 }}>
        {t('dashboard.kpiHeader.sectionLabel', { metric: metricLabel, currentPeriod: currentPeriodLabel, period: comparisonLabel })}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
        <Item label={currentPeriodLabel} value={currentLabel} />
        <Typography color="text.disabled">|</Typography>
        <Item label={comparisonLabel} value={yoyLabel} />
        <Typography color="text.disabled">|</Typography>
        <Item label={t('dashboard.kpiHeader.change')} value={changeLabel} valueColor={changeColor} icon={TrendIcon} />
      </Box>
    </Box>
  );
}
