// frontend/src/components/filters/ScopeFilterFields.tsx
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import type { SxProps, Theme } from '@mui/material/styles'
import type { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { FILTER_FIELD_WIDTH } from './filterFieldWidth'

type ScopedFilter = ReturnType<typeof useScopedCompanyFilter>

export interface ScopeFilterFieldsProps {
  /** Hasil useScopedCompanyFilter() - komponen ini murni presentational, tidak manage state sendiri. */
  filter: ScopedFilter
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
  /** Subset field yang dirender (default semua) — dipakai caller yang misah
   * Entity di "quick filter" dan Branch/Division di panel "Filter Lanjutan"
   * (mis. Growth/index.tsx, instruksi user 2026-08-20), TANPA duplikasi markup. */
  fields?: Array<'entity' | 'branch' | 'division'>
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
export function ScopeFilterFields({ filter, size = 'small', sx, fields = ['entity', 'branch', 'division'] }: ScopeFilterFieldsProps) {
  const { t } = useTranslation()
  const {
    companies, showCompanyFilter, companyId, setCompanyId,
    branchOptions, showBranchFilter, branchId, setBranchId,
    divisionOptions, showDivisionFilter, division, setDivision,
  } = filter

  // Filter berjenjang (2026-08-20, instruksi user): Branch baru bisa dipilih
  // kalau Company sudah dipersempit ke 1 entitas spesifik, Division baru bisa
  // dipilih kalau Branch juga sudah dipersempit — field-nya harus TETAP
  // TAMPIL (disabled/abu-abu), BUKAN disembunyikan, selama parent-nya masih
  // 'all' (koreksi user: awalnya field malah hilang total, bukan disabled,
  // karena branchOptions kosong saat companyId==='all' jadi showBranchFilter
  // ikut false). Begitu company dipilih dan opsinya cuma <=1 (genuinely tidak
  // ada pilihan berarti), showBranchFilter/showDivisionFilter tetap dipakai
  // buat sembunyikan — itu kasus beda (bukan "belum dipilih").
  const branchDisabled = companyId === 'all'
  const divisionDisabled = branchId === 'all'
  const showBranch = branchDisabled || showBranchFilter
  const showDivision = divisionDisabled || showDivisionFilter

  return (
    <>
      {/* width: xs:'100%' — tiap field FULL WIDTH di mobile, bukan cuma minWidth tetap.
          Efeknya: dalam Stack/Box row + flexWrap:'wrap' (dipakai di 9 halaman pemanggil),
          field 100% lebar otomatis "memaksa" baris baru sendiri - hasilnya stack rapi
          1 kolom di mobile TANPA perlu ubah direction parent jadi column secara terpisah
          di tiap halaman. Sebelumnya cuma minWidth (150-160px), di layar sempit 2 field
          muat berdampingan lewat wrap tapi keduanya kepotong/numpuk tidak rata. */}
      {fields.includes('entity') && showCompanyFilter && (
        <TextField
          select size={size} label={t('common.filters.entity')}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH }, ...sx }}
        >
          <MenuItem value="all">{t('common.filters.allEntities')}</MenuItem>
          {companies.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>
      )}

      {fields.includes('branch') && showBranch && (
        <TextField
          select size={size} label={t('common.branch')}
          value={branchId}
          disabled={branchDisabled}
          onChange={(e) => setBranchId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH }, ...sx }}
        >
          <MenuItem value="all">{t('common.all')}</MenuItem>
          {branchOptions.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </TextField>
      )}

      {fields.includes('division') && showDivision && (
        <TextField
          select size={size} label={t('customers.detail.division')}
          value={division}
          disabled={divisionDisabled}
          // Division sekarang division_id (number, task012 v2) — konversi eksplisit,
          // sama seperti Entity/Branch di atas (jangan andalkan `as` cast, MUI Select
          // event value bisa datang sebagai string tergantung render path).
          onChange={(e) => setDivision(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH }, ...sx }}
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
