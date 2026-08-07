// frontend/src/components/filters/ScopeFilterFields.tsx
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import type { SxProps, Theme } from '@mui/material/styles'
import type { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'

type ScopedFilter = ReturnType<typeof useScopedCompanyFilter>

export interface ScopeFilterFieldsProps {
  /** Hasil useScopedCompanyFilter() - komponen ini murni presentational, tidak manage state sendiri. */
  filter: ScopedFilter
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
  /**
   * Opt-in (default false, TIDAK mengubah perilaku 9+ halaman existing yang
   * sudah pakai komponen ini) — dipakai `KpiFilterBar` (task025, feedback
   * user 2026-08-07: "cabang tetap tampilkan tapi disabled jika pilihannya
   * semua entitas... perusahaan disabled jika user cuma punya akses ke 1
   * perusahaan"). Saat true:
   * - Field Perusahaan SELALU dirender (bukan disembunyikan saat
   *   `!showCompanyFilter`), `disabled` kalau user cuma punya 1 perusahaan.
   * - Field Cabang SELALU dirender (bukan disembunyikan saat
   *   `!showBranchFilter`), `disabled` kalau `companyId==='all'` — otomatis
   *   aktif begitu perusahaan spesifik dipilih.
   * Field tetap disembunyikan (bukan disabled) tetap dipakai halaman lama
   * secara default — sengaja beda perilaku, bukan bug.
   */
  alwaysShowCompanyAndBranch?: boolean
  /** Lebar tetap per-field (desktop, px) — default 160/150/150 (perilaku lama).
   * `KpiFilterBar` (task025) override ke 240/160/200 supaya field TIDAK
   * stretch mengisi sisa baris (feedback user 2026-08-07). Mobile (`xs`)
   * selalu 100% terlepas dari nilai ini. */
  companyWidth?: number
  branchWidth?: number
  divisionWidth?: number
}

/**
 * Dropdown Company/Branch/Division scope-aware - satu tempat untuk markup + gating
 * (showCompanyFilter/showBranchFilter/showDivisionFilter) yang sebelumnya disalin-tempel
 * beda-beda di tiap halaman (ada yang gate division pakai companyId!=='all', ada yang
 * tanpa gate sama sekali - sumber division/branch di luar scope ikut tampil di dropdown).
 *
 * Opsi yang muncul SUDAH difilter scope user oleh useScopedCompanyFilter() (via
 * getScopedBranches/getScopedDivisions) - komponen ini cuma render apa yang dikasih.
 */
export function ScopeFilterFields({
  filter, size = 'small', sx, alwaysShowCompanyAndBranch = false,
  companyWidth = 160, branchWidth = 150, divisionWidth = 150,
}: ScopeFilterFieldsProps) {
  const { t } = useTranslation()
  const {
    companies, showCompanyFilter, companyId, setCompanyId,
    branchOptions, showBranchFilter, branchId, setBranchId,
    divisionOptions, showDivisionFilter, division, setDivision,
  } = filter

  const showCompany = showCompanyFilter || alwaysShowCompanyAndBranch
  const showBranch = showBranchFilter || alwaysShowCompanyAndBranch

  return (
    <>
      {/* width: xs:'100%' — tiap field FULL WIDTH di mobile, bukan cuma minWidth tetap.
          Efeknya: dalam Stack/Box row + flexWrap:'wrap' (dipakai di 9 halaman pemanggil),
          field 100% lebar otomatis "memaksa" baris baru sendiri - hasilnya stack rapi
          1 kolom di mobile TANPA perlu ubah direction parent jadi column secara terpisah
          di tiap halaman. Sebelumnya cuma minWidth (150-160px), di layar sempit 2 field
          muat berdampingan lewat wrap tapi keduanya kepotong/numpuk tidak rata. */}
      {showCompany && (
        <TextField
          select size={size} label={t('common.filters.entity')}
          value={companyId}
          disabled={!showCompanyFilter}
          onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          sx={{ width: { xs: '100%', sm: companyWidth }, ...sx }}
        >
          <MenuItem value="all">{t('common.filters.allEntities')}</MenuItem>
          {companies.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>
      )}

      {showBranch && (
        <TextField
          select size={size} label={t('common.branch')}
          value={branchId}
          disabled={companyId === 'all'}
          onChange={(e) => setBranchId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          sx={{ width: { xs: '100%', sm: branchWidth }, ...sx }}
        >
          <MenuItem value="all">{t('common.all')}</MenuItem>
          {branchOptions.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </TextField>
      )}

      {showDivisionFilter && (
        <TextField
          select size={size} label={t('customers.detail.division')}
          value={division}
          // Division sekarang division_id (number, task012 v2) — konversi eksplisit,
          // sama seperti Entity/Branch di atas (jangan andalkan `as` cast, MUI Select
          // event value bisa datang sebagai string tergantung render path).
          onChange={(e) => setDivision(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: { xs: '100%', sm: divisionWidth }, ...sx }}
          // MUI Select tidak render teks MenuItem terpilih kalau value === '' kecuali
          // displayEmpty di-set - beda dari Entity/Branch yang pakai sentinel 'all'
          // (non-empty), jadi selalu tampil normal tanpa perlu ini.
          // inputLabel.shrink:true WAJIB juga - InputLabel MUI menentukan posisi
          // "shrink" (mengecil ke atas border) berdasarkan ADA-TIDAKNYA value, dan
          // string kosong dianggap "tidak ada value" walau displayEmpty bikin Select-nya
          // sendiri tetap tampilkan teks placeholder. Tanpa ini label "Division" tetap di
          // posisi awal (belum mengecil) SEKALIGUS teks "All Divisions" tampil di tempat
          // yang sama - dua teks bertumpuk. Entity/Branch tidak butuh ini karena value-nya
          // selalu non-empty ('all' atau angka), shrink otomatis benar dari value itu sendiri.
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">{t('common.filters.allDivisions')}</MenuItem>
          {divisionOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      )}
    </>
  )
}
