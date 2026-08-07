// frontend/src/components/analisis/KpiSummaryStrip.tsx
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useTranslation } from 'react-i18next'
import { Card, StatusChip } from '@/components/ui'
import { resolveTrendKind, trendKindColor, formatGrowthPct } from '@/utils/analisisComparison'
import type { StatusChipColor } from '@/components/ui/StatusChip'

export interface KpiSummaryStripMetric {
  label: string
  comparisonText: string
  currentText: string
}

export interface KpiSummaryStripGrowthItem {
  /** Harus match urutan/isi `metrics` (label sama) — 1 growth per metrik. */
  metricLabel: string
  /** Perubahan % — null kalau tidak ada baseline pembanding sama sekali. */
  pct: number | null
  /** Nilai perubahan absolut (current - comparison). */
  value: number
  /** current metric === 0 persis — beda "Berhenti" dari "Turun" biasa. */
  currentIsZero: boolean
  /** true = kenaikan utk metrik ini justru BURUK (dormant dst),
   * lihat `utils/metricPolarity.ts`. Cuma warna yang dibalik, bukan arah
   * panah (tetap sesuai data asli). */
  inversePolarity?: boolean
  /** Paksa "Belum ada data" apapun pct/value — dipakai saat SELURUH set
   * terfilter kosong di periode ini (isEmptyPeriod, task024/025 "alarm palsu
   * massal"), BUKAN per-metrik individual (per-metrik yang genuinely
   * berhenti tetap boleh tampil "Berhenti" merah, itu sinyal asli). */
  forceNoData?: boolean
  /** Caller yang format angka (Rupiah/jumlah/dst) — komponen ini generic. */
  formatValue: (v: number) => string
}

export interface KpiSummaryStripProps {
  metrics: KpiSummaryStripMetric[]
  /** Label rentang tanggal literal — HARUS string yang SAMA persis dengan
   * header kolom tabel (satu sumber kebenaran, task025 feedback 2026-08-07),
   * bukan label "Semester (2) Tahun X" ataupun kata relatif "Lampau/Ini". */
  comparisonRangeLabel: string
  currentRangeLabel: string
  isCurrentInProgress?: boolean
  /** 1 entri per metrik di `metrics` (urutan sama) — slot growth SELALU
   * dirender per metrik (layout stabil, tak pernah lompat antar state). */
  growth: KpiSummaryStripGrowthItem[]
  onPrev: () => void
  onNext: () => void
  nextDisabled?: boolean
}

const GROWTH_COLOR_MAP: Record<StatusChipColor, string> = {
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
  info: 'info.main',
  primary: 'primary.main',
  default: 'text.secondary',
}

function GrowthRow({ item }: { item: KpiSummaryStripGrowthItem }) {
  const { t } = useTranslation()
  const kind = item.forceNoData ? 'none' : resolveTrendKind(item.pct, item.currentIsZero)
  // alert=true — slot ringkasan ini binary hijau/merah saja ("Naik → hijau;
  // Turun → merah"), tidak ada status oranye/warning menengah di level
  // agregat ini (beda dari badge per-baris tabel yang punya threshold sendiri).
  const color = trendKindColor(kind, true, item.inversePolarity)
  const colorSx = GROWTH_COLOR_MAP[color]
  const arrow = kind === 'up' ? '▲' : kind === 'down' ? '▼' : ''

  let mainText: string
  let subText: string | null = null

  switch (kind) {
    case 'none':
      mainText = `— ${t('analisis.noDataLabel')}`
      break
    case 'new':
      mainText = t('analisis.newBusiness')
      subText = item.formatValue(item.value)
      break
    case 'stopped':
      mainText = t('analisis.stoppedLabel')
      break
    case 'flat':
      mainText = t('analisis.flatLabel')
      break
    default: {
      // pct TANPA tanda (panah sudah menyatakan arah) — value DENGAN tanda
      // eksplisit (baris terpisah, tidak redundan dgn panah di baris pertama).
      mainText = `${arrow} ${formatGrowthPct(item.pct as number, false)}`
      const sign = item.value > 0 ? '+' : item.value < 0 ? '-' : ''
      subText = `${sign}${item.formatValue(Math.abs(item.value))}`
    }
  }

  return (
    <Box sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="body2" sx={{ minWidth: 0 }}>{item.metricLabel}</Typography>
        <Typography variant="body2" sx={{ color: colorSx, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {mainText}
        </Typography>
      </Box>
      {subText && (
        <Typography variant="caption" sx={{ color: colorSx, display: 'block', textAlign: 'right' }}>
          {subText}
        </Typography>
      )}
    </Box>
  )
}

/**
 * Section "TOTAL · SELURUH DATA" — grid 3 kartu (task025, ux-menu-mapping.md
 * §5, redesain 2026-08-07): kartu 1 = periode pembanding, kartu 2 = periode
 * ini, kartu 3 = pertumbuhan per-metrik. Header (judul + chevron ‹ ›) di LUAR
 * kartu manapun (sebelumnya melayang di pojok 1 kartu tunggal). Menggantikan
 * `PeriodTotalBox` (2 kotak + panah → + kalimat pertumbuhan tunggal di bawah).
 *
 * SATU-SATUNYA tempat menulis layout ini untuk semua halaman KPI (task025)
 * — jangan disalin-tempel manual, import komponen ini
 * (lihat [[feedback_centralize_ui_no_duplication]]).
 */
export function KpiSummaryStrip({
  metrics, comparisonRangeLabel, currentRangeLabel, isCurrentInProgress = false,
  growth, onPrev, onNext, nextDisabled = false,
}: KpiSummaryStripProps) {
  const { t } = useTranslation()

  return (
    <Box>
      {/* Header DI LUAR kartu — caption kiri, chevron kanan. */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: '0.06em', color: 'text.disabled', textTransform: 'uppercase' }}
        >
          {t('analisis.summaryStripTitle')}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t('analisis.prevPeriodTooltip')}>
            <IconButton size="small" onClick={onPrev} aria-label={t('analisis.prevPeriodTooltip')}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('analisis.nextPeriodTooltip')}>
            <span>
              <IconButton size="small" onClick={onNext} disabled={nextDisabled} aria-label={t('analisis.nextPeriodTooltip')}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Grid 3 kolom (desktop), stack 1 kolom urutan 1→2→3 (mobile) — bukan
          lagi 2 kotak+panah manual. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {/* ── Kartu 1: Periode Pembanding ── */}
        <Card sx={{ p: 2, textAlign: 'left' }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
            {comparisonRangeLabel}
          </Typography>
          {/* minHeight — supaya tinggi baris sub-label SAMA dgn kartu 2 (yang
              kadang berisi chip "Sedang berjalan", kadang kosong), layout
              tidak lompat naik-turun antar kartu. */}
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, minHeight: '1.5em' }}>
            {t('analisis.comparisonSubLabel')}
          </Typography>
          {metrics.map((m) => (
            <Typography key={m.label} variant="body2">
              {m.label}: <strong>{m.comparisonText}</strong>
            </Typography>
          ))}
        </Card>

        {/* ── Kartu 2: Periode Ini ── */}
        <Card sx={{ p: 2, textAlign: 'left' }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
            {currentRangeLabel}
          </Typography>
          <Box sx={{ minHeight: '1.5em', mb: 0.5, display: 'flex', alignItems: 'center' }}>
            {isCurrentInProgress && (
              <StatusChip size="small" color="warning" label={t('analisis.inProgress')} />
            )}
          </Box>
          {metrics.map((m) => (
            <Typography key={m.label} variant="body2" sx={{ fontWeight: 700 }}>
              {m.label}: {m.currentText}
            </Typography>
          ))}
        </Card>

        {/* ── Kartu 3: Pertumbuhan per-metrik — slot SELALU dirender per
            metrik (bukan 1 kalimat tunggal lagi), supaya layout stabil di
            semua state (naik/turun/datar/baru/berhenti/tanpa-data). ── */}
        <Card sx={{ p: 2, textAlign: 'left' }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
            {t('analisis.growthLabel')}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, minHeight: '1.5em' }}>
            {t('common.filters.vsSamePeriodLastYear')}
          </Typography>
          {growth.map((g) => (
            <GrowthRow key={g.metricLabel} item={g} />
          ))}
        </Card>
      </Box>
    </Box>
  )
}
