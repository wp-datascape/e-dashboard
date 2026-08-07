// frontend/src/components/filters/KpiFilterBar.tsx
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import { DatePicker } from '@/components/ui/DatePicker'
import { FilterBarShell } from './FilterBarShell'
import type { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { todayIsoDate } from '@/utils/date'
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
  KPI_PERIOD_TYPES, type KpiPeriodType,
} from '@/utils/analisisPeriod'

export type { KpiPeriodType }

export interface KpiFilterBarProps {
  /** Hasil useScopedCompanyFilter() — komponen ini murni presentational,
   * state scope (entitas/cabang/divisi/intercompany) tetap di caller. */
  filter: ReturnType<typeof useScopedCompanyFilter>
  periodType: KpiPeriodType
  onPeriodTypeChange: (v: KpiPeriodType) => void
  /** Tanggal acuan ("per tanggal"), format YYYY-MM-DD. Awal periode dihitung
   * otomatis dari periodType + tanggal ini (mirror logic Analisis existing). */
  endDate: string
  onEndDateChange: (v: string) => void
  /** Reset tambahan spesifik halaman (search, toggle "Utamakan pelanggan
   * besar", dll) — dipanggil BERSAMA reset scope+periode bawaan komponen ini,
   * bukan pengganti. Opsional, default no-op. */
  onResetExtra?: () => void
}

/**
 * Filter bar terpusat untuk SEMUA halaman KPI (task025) — 2 baris dengan label
 * eksplisit "SIAPA"/"KAPAN" supaya user tidak perlu menebak mana filter
 * identitas (entitas/cabang/divisi) vs filter waktu (periode/tanggal).
 * Dipicu keluhan: filter bar sebelumnya (semua field sebaris tanpa
 * pengelompokan) bikin orang sulit membedakan fungsi tiap field sekilas
 * pandang (audit UX 2026-08-07).
 *
 * SATU-SATUNYA tempat menulis layout ini — jangan disalin-tempel manual ke
 * halaman KPI baru, import komponen ini (lihat [[feedback_centralize_ui_no_duplication]]).
 * Baris "KAPAN" menghitung sendiri rentang tanggal current vs comparison
 * (SELALU YoY, lihat task025 §0a) dari `periodType`+`endDate` yang diberikan
 * — caller tidak perlu hitung `currentRangeText`/`comparisonRangeText` sendiri
 * lagi seperti pola lama di `Analisis/index.tsx`.
 */
export function KpiFilterBar({
  filter, periodType, onPeriodTypeChange, endDate, onEndDateChange, onResetExtra,
}: KpiFilterBarProps) {
  const { t } = useTranslation()
  const todayStr = todayIsoDate()

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate))
  const periodStart = getPeriodDateRange(periodType, periodKey).start
  const currentRangeText = formatDateRange({ start: periodStart, end: endDate })
  // Rentang pembanding ditulis LENGKAP (tanggal-bulan-tahun kedua sisi), BUKAN
  // "vs periode sama {{year}}" — feedback user 2026-08-07: deskripsi tahun
  // saja membingungkan buat pengguna minim literasi, harus tanggal jelas.
  const comparisonRangeText = formatDateRange({
    start: shiftDateByYears(periodStart, -1),
    end: shiftDateByYears(endDate, -1),
  })

  // Field width TETAP (BUKAN stretch/flex) — feedback user 2026-08-07:
  // "select/input tidak boleh stretch mengisi sisa baris". Nilai persis dari
  // spec: Perusahaan 240 · Cabang 160 · Divisi 200 · Periode 180 · Tanggal 170.
  const periodFieldSx = { width: { xs: '100%', sm: 180 } } as const
  const dateFieldSx = { width: { xs: '100%', sm: 170 } } as const

  return (
    <FilterBarShell filter={filter} onResetExtra={onResetExtra}>
      {/* ── Baris 2 — Periode, Per Tanggal, baru teks rentang literal
          (urutan: kontrol dulu, teks penjelas SETELAHNYA). ── */}
      <FormControl size="small" sx={periodFieldSx}>
        <InputLabel>{t('common.filters.period')}</InputLabel>
        <Select
          value={periodType}
          label={t('common.filters.period')}
          onChange={(e) => onPeriodTypeChange(e.target.value as KpiPeriodType)}
        >
          {KPI_PERIOD_TYPES.map((p) => (
            <MenuItem key={p} value={p}>{t(`paretoThreshold.period.${p}`)}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <DatePicker
        size="small"
        label={t('common.filters.asOfDate')}
        value={endDate}
        onChange={(e) => {
          const picked = e.target.value
          onEndDateChange(picked && picked > todayStr ? todayStr : picked)
        }}
        sx={dateFieldSx}
      />

      {/* whiteSpace:nowrap PER TANGGAL (bukan pada seluruh kalimat) — supaya
          "1 April – 7 Mei 2026" tidak terpotong jadi 2 baris di tengah
          tanggal saat wrap ke mobile, tapi kalimat masih boleh wrap di
          sekitar kata "dibandingkan". */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ flexShrink: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
      >
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{currentRangeText}</Box>
        {' '}
        {t('common.filters.comparedTo')}
        {' '}
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{comparisonRangeText}</Box>
      </Typography>
    </FilterBarShell>
  )
}
