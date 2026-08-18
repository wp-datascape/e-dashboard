import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';

export interface PeriodYoyMetric {
  /** Label metrik — cuma dirender kalau `metrics.length > 1` (banner
   * multi-metrik, mis. Revenue + Laba Kotor di halaman Revenue). */
  label?: string;
  /** Nilai baseline (tahun lalu) SUDAH diformat sesuai unit metriknya (mis. "Rp 6,8jt", "65.0%"). */
  baselineValueText: string;
  /** Delta absolut SUDAH diformat, TANPA tanda +/- ▲/▼ (ditambahkan otomatis). */
  deltaValueText: string;
  /** % perubahan YoY (dari `computeChangePct`) — arah panah & warna badge ikut ini.
   * `null` = tidak ada baseline pembanding (blok metrik ini disembunyikan). */
  growthPct: number | null;
  /** Metrik yang naik = buruk (mis. Dormant Rate/Value) — balik warna hijau/merah,
   * arah panah TETAP ikut arah data asli. Default false. */
  inversePolarity?: boolean;
}

export interface PeriodYoyBannerProps {
  currentRangeText: string;
  comparisonRangeText: string;
  /** 1 metrik (kasus umum) atau lebih (mis. halaman Revenue: Revenue + GP
   * sekaligus) — tiap metrik dapat 1 blok baseline+perubahan sendiri. */
  metrics: PeriodYoyMetric[];
}

function MetricBlock({ metric }: { metric: PeriodYoyMetric }) {
  const { t } = useTranslation();
  const { label, baselineValueText, deltaValueText, growthPct, inversePolarity = false } = metric;
  if (growthPct === null) return null;
  const isUp = growthPct >= 0;
  const isGood = inversePolarity ? !isUp : isUp;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
      {label && (
        <Typography variant="caption" sx={{ gridColumn: '1 / -1', fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>
          {label}
        </Typography>
      )}
      <Box sx={{
        textAlign: 'right', px: 1.5, py: 1, borderRadius: 1.5,
        bgcolor: (theme) => theme.custom.soft(theme.palette.primary.main),
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {t('common.periodBanner.yoyBaseline')}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>{baselineValueText}</Typography>
      </Box>
      <Box sx={{
        textAlign: 'right', px: 1.5, py: 1, borderRadius: 1.5,
        bgcolor: (theme) => theme.custom.soft(isGood ? theme.palette.success.main : theme.palette.error.main),
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {t('common.periodBanner.yoyChange')}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, color: isGood ? 'success.main' : 'error.main' }}>
          {isUp ? '▲' : '▼'} {isUp ? '+' : '-'}{deltaValueText} ({isUp ? '+' : ''}{growthPct.toFixed(1)}%)
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Banner "Detail Periode & Pembanding YoY" — dipusatkan dari template
 * KPI4/CustomerGrossProfit (task026 §8n, 2026-08-09) supaya 9 halaman KPI
 * lain yang di-standarkan ke pola sama (2026-08-10, instruksi user "standar
 * yang sama dari layout dan filtering") TIDAK copy-paste JSX yang sama
 * sembilan kali (lihat [[feedback_centralize_ui_no_duplication]]). Isi &
 * styling blok kiri (ikon kalender + rentang aktif + rentang YoY) PERSIS
 * sama dgn `CustomerGrossProfit/index.tsx`. Blok kanan digeneralisasi jadi
 * array `metrics` (KPI4 cuma 1 metrik total, halaman lain spt Revenue butuh
 * 2 sekaligus — Revenue & Laba Kotor).
 */
export function PeriodYoyBanner({ currentRangeText, comparisonRangeText, metrics }: PeriodYoyBannerProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'primary.main', color: 'primary.contrastText',
        }}>
          <CalendarMonthOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: 'primary.main', textTransform: 'uppercase', display: 'block' }}>
            {t('common.periodBanner.label')}
          </Typography>
          <Typography variant="body2">
            <Box component="span" color="text.secondary">{t('common.periodBanner.activePeriod')}: </Box>
            <Box component="span" sx={{ fontWeight: 700 }}>{currentRangeText}</Box>
          </Typography>
          <Typography variant="body2">
            <Box component="span" color="text.secondary">{t('common.periodBanner.yoyComparison')}: </Box>
            <Box component="span" sx={{ fontWeight: 700 }}>{comparisonRangeText}</Box>
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-end', width: { xs: '100%', sm: 'auto' } }}>
        {metrics.map((m, idx) => <MetricBlock key={m.label ?? idx} metric={m} />)}
      </Box>
    </Card>
  );
}
