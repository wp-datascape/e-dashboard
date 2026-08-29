// frontend/src/components/filters/PeriodTypeFilterFields.tsx
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useTranslation } from 'react-i18next'
import type { SxProps, Theme } from '@mui/material/styles'
import { DatePicker } from '@/components/ui/DatePicker'
import type { usePeriodTypeFilter, PeriodGranularity } from '@/hooks/usePeriodTypeFilter'
import { FILTER_FIELD_WIDTH } from './filterFieldWidth'
import { todayIsoDate } from '@/utils/date'

type PeriodTypeFilter = ReturnType<typeof usePeriodTypeFilter>

const GRANULARITIES: PeriodGranularity[] = ['monthly', 'quarter', 'semester', 'annual']

export interface PeriodTypeFilterFieldsProps {
  /** Hasil usePeriodTypeFilter() — komponen ini murni presentational, tidak manage state sendiri. */
  filter: PeriodTypeFilter
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
  /** Tampilkan baris navigator (chevron prev/next + label periode ter-resolve) di
   * bawah 2 dropdown. Default true. Set false kalau caller cuma butuh dropdown-nya
   * saja (mis. mau bikin navigator versi sendiri). */
  showNavigator?: boolean
  /** Tampilkan field Tanggal "as of". Default true. Set false kalau caller sudah
   * punya date picker sendiri di tempat lain (mis. Growth/index.tsx quick filter
   * bar "Periode") dan cuma butuh dropdown Granularitas-nya saja di sini —
   * instruksi user 2026-08-20, hindari 2 field tanggal terpisah nyampur di 1 halaman. */
  showDateField?: boolean
}

/**
 * Filter granularitas periode (Monthly/Quarterly/Semester/Annual) + tanggal
 * "as of" + navigator prev/next — task029.md §21/§22/§30, instruksi user
 * 2026-08-20 ("buat dulu filter globalnya agar reuseable di komponen lain").
 *
 * Markup & interaksi di-mirror dari halaman Analisis (task016, Card block
 * Select+DatePicker+chevron yang sudah teruji lewat beberapa putaran
 * perbaikan user) — diekstrak ke sini supaya Growth/Retention/Value bisa
 * pakai TANPA menyalin ulang markup-nya. Analisis/index.tsx sendiri BELUM
 * direfactor ke hook/komponen ini (di luar scope task ini) — kandidat
 * follow-up konsolidasi, bukan urgent karena halamannya sudah jalan.
 *
 * PENTING: filter ini baru mengubah state di frontend. Belum ada halaman
 * KPI (Growth/Retention/Value) yang benar-benar mem-fetch data pakai
 * `periodType` dari sini — backend M1-M10 belum menerima granularitas ini
 * sama sekali (lihat §30.4/§30.5). Komponen ini disiapkan lebih dulu supaya
 * siap dipasang begitu 1 KPI contoh selesai di backend.
 */
export function PeriodTypeFilterFields({ filter, size = 'small', sx, showNavigator = true, showDateField = true }: PeriodTypeFilterFieldsProps) {
  const { t } = useTranslation()
  const {
    periodType, setPeriodType,
    endDate, setEndDate,
    periodLabel, currentRangeText, comparisonRangeText,
    isViewingInProgress,
    goToPrevious, goToNext,
  } = filter

  return (
    // width xs:'100%' — dipakai sebagai 1 flex item di filter bar caller (mis.
    // Growth/index.tsx, flexWrap:'wrap'). Tanpa ini, di mobile komponen ini
    // TIDAK ikut memaksa baris baru sendiri seperti field lain (yang masing-
    // masing sudah width:100% - lihat catatan sama di ScopeFilterFields.tsx),
    // jadi 2 field di dalamnya (Granularitas+Tanggal) numpuk/berantakan
    // sejajar dengan field sebelumnya alih-alih stack rapi 1 kolom.
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: showNavigator ? 1.5 : 0, width: { xs: '100%', sm: 'auto' } }}>
      {/* Box+gap (BUKAN Stack spacing) — Stack `spacing` di direction="row" cuma
          margin-left (horizontal), begitu item wrap ke baris baru (mobile,
          field width:100%) gap vertikalnya HILANG karena spacing itu tidak
          pernah dirancang isi celah antar-baris. gap CSS asli benar di kedua
          arah, sama seperti Box pembungkus di Growth/index.tsx (koreksi user
          2026-08-20 — screenshot mobile: "Tanggal" mepet ke field di atasnya). */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <TextField
          select
          size={size}
          label={t('common.filters.periodType')}
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as PeriodGranularity)}
          sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH }, ...sx }}
        >
          {GRANULARITIES.map((p) => (
            <MenuItem key={p} value={p}>{t(`paretoThreshold.period.${p}`)}</MenuItem>
          ))}
        </TextField>

        {showDateField && (
          <DatePicker
            size={size}
            label={t('common.filters.asOfDate')}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            // max = hari ini (2026-08-23, permintaan user: "tidak bisa
            // memilih tanggal bulan dan tahun masa depan di date picker") —
            // `setEndDate` (usePeriodTypeFilter.ts) SUDAH clamp future date
            // ke hari ini SETELAH dipilih, `max` di sini mencegah calendar
            // widget bawaan browser bahkan MENAMPILKAN tanggal itu sbg bisa
            // diklik sama sekali (termasuk navigasi bulan/tahun di kalender).
            max={todayIsoDate()}
            sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH }, ...sx }}
          />
        )}
      </Box>

      {showNavigator && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" sx={{ flexShrink: 0 }} onClick={goToPrevious}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Stack spacing={0.25} sx={{ alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap sx={{ maxWidth: '100%' }}>
              {periodLabel}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' }, maxWidth: '100%' }}
            >
              {t('common.filters.comparisonRange')}: {comparisonRangeText} • {t('common.filters.period')}: {currentRangeText}
            </Typography>
          </Stack>
          <IconButton size="small" sx={{ flexShrink: 0 }} disabled={isViewingInProgress} onClick={goToNext}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  )
}
