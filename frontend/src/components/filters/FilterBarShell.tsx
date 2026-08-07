// frontend/src/components/filters/FilterBarShell.tsx
import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import { useTranslation } from 'react-i18next'
import { Card, Button } from '@/components/ui'
import { ScopeFilterFields } from './ScopeFilterFields'
import { ExcludeIntercompanyToggle } from './ExcludeIntercompanyToggle'
import type { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'

export interface FilterBarShellProps {
  /** Hasil useScopedCompanyFilter() — komponen ini murni presentational. */
  filter: ReturnType<typeof useScopedCompanyFilter>
  /** Reset tambahan spesifik halaman (search, endDate, periodType, dll) —
   * dipanggil BERSAMA `filter.reset()`, bukan pengganti. */
  onResetExtra?: () => void
  /** Baris 2 ("KAPAN") — kontrol waktu, beda per halaman: periodType+tanggal
   * (KpiFilterBar), tanggal tunggal, bulan (Dashboard).
   * Baris 1 ("SIAPA") SELALU sama, itu yang dipusatkan di sini. */
  children: ReactNode
}

/**
 * Shell terpusat baris 1 ("SIAPA" — Perusahaan/Cabang/Divisi/Kecualikan
 * intercompany/Reset) untuk SEMUA filter bar halaman KPI + Dashboard
 * (task025 §16 lanjutan, 2026-08-07 — user: "komponen filter sudah 1
 * kesatuan atomic komponen yang tinggal dipanggil ulang sebagai filter
 * global mulai halaman dashboard sampai halaman lainnya").
 *
 * Sebelumnya baris 1 ini di-copy-paste identik 2x antara `KpiFilterBar` dan
 * `DateScopeFilterBar` (komponen lama, sudah dihapus — halaman terakhir
 * pemakainya, CrossSelling/AvgCategoryPerCustomer, sudah pindah ke
 * `KpiFilterBar` di task025 §16), dan Dashboard punya versi ke-3 yang malah
 * TIDAK sama chrome-nya (bukan Card+2-baris, lebar field tidak tetap, tanpa
 * tombol Reset) — pelanggaran
 * [[feedback_centralize_ui_no_duplication]]. Baris 2 ("KAPAN") SENGAJA
 * TIDAK dipusatkan — kontrol waktunya genuinely beda per halaman (bukan
 * duplikasi yang harus disatukan, lihat ux-menu-mapping.md §1 pemisahan
 * SIAPA/KAPAN), caller kirim lewat `children`.
 */
export function FilterBarShell({ filter, onResetExtra, children }: FilterBarShellProps) {
  const { t } = useTranslation()

  return (
    <Card sx={{ p: 2 }}>
      {/* ── Baris 1 — SIAPA: perusahaan/cabang/divisi/intercompany/reset ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <ScopeFilterFields
          filter={filter}
          alwaysShowCompanyAndBranch
          companyWidth={240}
          branchWidth={160}
          divisionWidth={200}
        />
        <ExcludeIntercompanyToggle checked={filter.excludeIntercompany} onChange={filter.setExcludeIntercompany} />
        <Button
          variant="outlined"
          size="small"
          sx={{ ml: { sm: 'auto' } }}
          onClick={() => {
            filter.reset()
            onResetExtra?.()
          }}
        >
          {t('common.reset')}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ── Baris 2 — KAPAN: kontrol waktu, spesifik per halaman ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {children}
      </Box>
    </Card>
  )
}
