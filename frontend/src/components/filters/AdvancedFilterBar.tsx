import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { useTranslation } from 'react-i18next'
import { ScopeFilterFields } from './ScopeFilterFields'
import { ExcludeIntercompanyToggle } from './ExcludeIntercompanyToggle'
import { ParetoFilterToggle } from './ParetoFilterToggle'
import { PeriodTypeFilterFields } from './PeriodTypeFilterFields'
import { FILTER_FIELD_WIDTH } from './filterFieldWidth'
import { DatePicker } from '@/components/ui/DatePicker'
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess'
import type { useAdvancedFilterBar } from '@/hooks/useAdvancedFilterBar'
import { clampDateNotFuture, todayIsoDate } from '@/utils/date'

type AdvancedFilterBar = ReturnType<typeof useAdvancedFilterBar>

export interface AdvancedFilterBarProps {
  /** Judul halaman — dirender sejajar quick bar (`justifyContent:'space-between'`,
   * pola tetap sejak 2026-08-22: "pindah filter ke sebelah kanan sejajar
   * dengan judul halaman"). */
  title: ReactNode
  /** Elemen tambahan di baris judul, sebelum quick bar (mis. `PeriodStrip`
   * di Overview). Opsional. */
  titleAdornment?: ReactNode
  /** Hasil useAdvancedFilterBar() — komponen ini murni presentational, tidak manage state sendiri. */
  filter: AdvancedFilterBar
  /** User punya akses ke section manapun yang dikontrol filter ini — kalau
   * false, quick bar disembunyikan & `NoSectionAccess` dirender menggantikan
   * `children`, pola sama Growth/Retention/Value. */
  hasAccess: boolean
  /** Spinner tombol "Terapkan" — true kalau query yang dikontrol filter ini sedang fetch ulang. */
  loading?: boolean
  /** Tampilkan checkbox "Apply date cutoff" (quick bar) / toggle Pareto
   * (panel lanjutan). Default true (perilaku Growth/Retention/Value/
   * Report-* yang sudah ada). Set false utk halaman yang tidak punya
   * konsep ini (mis. Overview — backend hardcode `only_pareto: false`,
   * tidak ada UI Pareto sama sekali). */
  showParetoAndDateCutoff?: boolean
  /** Konten yang cuma tampil kalau `hasAccess` true — dirender TEPAT
   * setelah panel Filter Lanjutan (biasanya daftar chart/tabel KPI
   * halaman itu). */
  children: ReactNode
}

/**
 * "Filter global" — quick bar (Entitas + Periode + [Apply date cutoff]) auto-
 * apply sejajar judul halaman, + panel Filter Lanjutan (Cabang/Divisi/
 * Granularitas/Exclude Intercompany/[Pareto], staged) di-toggle tombol
 * "Filter Lanjutan" di quick bar, isinya baru berlaku begitu tombol
 * "Terapkan" diklik.
 *
 * DIEKSTRAK 2026-08-28 (task029.md §41-lanjutan) dari 6 salinan identik
 * (Growth/Retention/Value/Report-Growth/Report-Retention/Report-Revenue,
 * lihat JSDoc `useAdvancedFilterBar` utk riwayat lengkap & alasan
 * ekstraksi) — 1 IMPORT, 1 pemanggilan per halaman (koreksi user 2026-08-28:
 * "kenapa harus dijadikan import 2x" — percobaan pertama dipecah jadi 2
 * komponen terpisah krn quick bar & panel lanjutan duduk di 2 posisi
 * layout berbeda, SEKARANG komponen ini yang menangani pemisahan itu
 * secara internal, bukan si pemanggil).
 */
export function AdvancedFilterBar({ title, titleAdornment, filter, hasAccess, loading = false, showParetoAndDateCutoff = true, children }: AdvancedFilterBarProps) {
  const { t } = useTranslation()
  const {
    quickScopeFilter, draftScopeFilter,
    periodEnd, setPeriodEnd,
    applyDateCutoff, setApplyDateCutoff,
    draftPeriodTypeFilter,
    draftOnlyPareto, setDraftOnlyPareto,
    advancedOpen, setAdvancedOpen,
    handleApplyFilter, handleResetFilter,
  } = filter

  return (
    <>
      {/* Judul + quick bar 1 baris (`justifyContent:'space-between'`, judul
          kiri filter kanan, stack ke kolom di mobile) — pola tetap sejak
          2026-08-22. */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{title}</Typography>
        {titleAdornment}

        {hasAccess && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
            <ScopeFilterFields filter={quickScopeFilter} fields={['entity']} />
            {/* type switch month<->date — value selalu dikonversi dari/ke
                periodEnd ('YYYY-MM-DD' penuh, SSOT). Mode bulan (checkbox
                OFF/tidak ada): tampilkan cuma 'YYYY-MM', onChange paksa
                hari ke 1. */}
            <DatePicker
              size="small" label={t('common.filters.periodDate')}
              type={showParetoAndDateCutoff && applyDateCutoff ? 'date' : 'month'}
              value={showParetoAndDateCutoff && applyDateCutoff ? periodEnd : periodEnd.slice(0, 7)}
              onChange={(e) => {
                const maxRaw = showParetoAndDateCutoff && applyDateCutoff ? todayIsoDate() : todayIsoDate().slice(0, 7)
                const picked = clampDateNotFuture(e.target.value, maxRaw)
                setPeriodEnd(showParetoAndDateCutoff && applyDateCutoff ? picked : `${picked}-01`)
              }}
              max={showParetoAndDateCutoff && applyDateCutoff ? todayIsoDate() : todayIsoDate().slice(0, 7)}
              sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }}
            />
            {showParetoAndDateCutoff && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={applyDateCutoff}
                    onChange={(e) => {
                      setApplyDateCutoff(e.target.checked)
                      if (!e.target.checked) setPeriodEnd(`${periodEnd.slice(0, 7)}-01`)
                    }}
                  />
                }
                label={t('common.filters.applyDateCutoff')}
                sx={{ ml: 0, whiteSpace: 'nowrap' }}
              />
            )}
            <Button
              size="small"
              color="inherit"
              startIcon={advancedOpen ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
              onClick={() => setAdvancedOpen((v) => !v)}
              sx={{ textTransform: 'none' }}
            >
              {t('common.filters.advancedFilters')}
            </Button>
          </Box>
        )}
      </Box>

      {!hasAccess ? (
        <NoSectionAccess />
      ) : (
        <>
          {/* Collapse (bukan cuma conditional render) — animasi slide buka/tutup panel. */}
          <Collapse in={advancedOpen}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <ScopeFilterFields filter={draftScopeFilter} fields={['branch', 'division']} />
                <PeriodTypeFilterFields filter={draftPeriodTypeFilter} showNavigator={false} showDateField={false} />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <ExcludeIntercompanyToggle checked={draftScopeFilter.excludeIntercompany} onChange={draftScopeFilter.setExcludeIntercompany} />
                {showParetoAndDateCutoff && (
                  <>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, my: 0.5 }} />
                    <ParetoFilterToggle checked={draftOnlyPareto} onChange={setDraftOnlyPareto} />
                  </>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={handleResetFilter}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('common.filters.resetFilter')}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleApplyFilter}
                  loading={loading}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('common.filters.applyFilter')}
                </Button>
              </Box>
            </Box>
          </Collapse>

          {children}
        </>
      )}
    </>
  )
}
