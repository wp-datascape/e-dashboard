import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { LineChartWidget } from '@/components/charts/LineChartWidget';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="body2"
      sx={{ fontWeight: 700, mb: 0.5, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
    >
      {label}
    </Typography>
  );
}

interface Props {
  isLoading: boolean
  // Tren 12 bulan (task025 §20, 2026-08-07) — chart 2-seri Kontribusi %
  // (porsi REVENUE dari produk High Margin) vs Penetrasi % (porsi CUSTOMER
  // yang membeli, = high_margin_ratio). Field `hm_revenue`/
  // `total_revenue_existing` SUDAH ada di trend (dipakai M3 sebelum
  // "Pemisahan M3" §4 keluarkan garis HM dari sana) — Kontribusi % dihitung
  // di sini (bukan backend baru), formula identik dgn m4.repository.ts
  // (hm_revenue/total_revenue*100, sudah dipakai utk hm_pct per-baris).
  trend?: CustomerMetricsTrendPoint[]
}

// Donut snapshot + dialog drill-down DIHAPUS (task025 §21, 2026-08-07 —
// user: "hapus donat chart, sudah digantikan tren"). Dialog-nya sebelumnya
// pakai useHmBreakdown yang REDUNDAN dgn tabel persisten yang sudah ada di
// halaman induk (HighMarginPenetration/index.tsx, bound ke endDate yang
// sama) — sama pola redundansi yang ditemukan di CrossSelling M2 (§13).
export function M5HighMargin({ isLoading, trend = [] }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const trendChartData = trend.map((p) => ({
    month: p.month,
    penetration_pct: p.high_margin_ratio,
    contribution_pct: p.total_revenue_existing > 0 ? Math.round((p.hm_revenue / p.total_revenue_existing) * 1000) / 10 : 0,
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <SectionLabel label={t('customerMetrics.m5.sectionLabel')} />
        <MuiTooltip
          title={t('customerMetrics.m5.tooltipInfo')}
          placement="top"
          arrow
          slotProps={{ tooltip: { sx: { maxWidth: 300, fontSize: 12, lineHeight: 1.5 } } }}
        >
          <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </MuiTooltip>
      </Box>
      {isLoading ? (
        <Skeleton variant="rectangular" height={260} />
      ) : (
        <LineChartWidget
          title={t('customerMetrics.m5.trendChartTitle')}
          subtitle={t('customerMetrics.m5.trendChartSubtitle')}
          data={trendChartData}
          series={[
            { key: 'contribution_pct', label: t('customerMetrics.m5.seriesContribution'), color: theme.palette.warning.main, formatValue: (v) => `${v}%` },
            { key: 'penetration_pct', label: t('customerMetrics.m5.seriesPenetration'), color: theme.palette.info.main, formatValue: (v) => `${v}%` },
          ]}
          xKey="month"
          height={260}
        />
      )}
    </Box>
  );
}
