import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';

import { useCrossSelling, useCustomerMetrics } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { useCan } from '@/hooks/useCan';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { ParetoFilterToggle } from '@/components/filters/ParetoFilterToggle';
import { FILTER_FIELD_WIDTH } from '@/components/filters/filterFieldWidth';
import { DatePicker } from '@/components/ui/DatePicker';
import { NoSectionAccess } from '@/components/dashboard/NoSectionAccess';
import { PeriodTypeFilterFields } from '@/components/filters/PeriodTypeFilterFields';
import { usePeriodTypeFilter } from '@/hooks/usePeriodTypeFilter';
import { todayStr } from '../CrossSelling/helpers';
import { clampDateNotFuture } from '@/utils/date';
import { M1CrossSelling } from '../CrossSelling/M1CrossSelling';
import { M2AvgCategory } from '../CrossSelling/M2AvgCategory';
import { M7ExpansionGrowth } from '../CustomerMetrics/M7ExpansionGrowth';

// Growth (task029.md §2, §8-10, §29 lalu §30.19): M1 Cross Selling, M2
// Average Product Category, M7 Customer Expansion Rate.
//
// 2026-08-22 (koreksi keras user: "kembalikan ke kondisi UI awal", "buatkan
// halaman khusus tabel, terlalu kotor jika chart digabung dengan tabel") —
// tab luar per-KPI (§29, dipasang 2026-08-19) DIHAPUS, dikembalikan ke pola
// DITUMPUK VERTIKAL (sama seperti Retention/index.tsx & Value/index.tsx —
// referensi eksplisit user), SEMUA KPI yang permission-nya dimiliki user
// dirender sekaligus, bukan 1 KPI aktif via tab. Tabel breakdown (dulu
// nempel permanen di tab "Trend Analysis" tiap KPI) DIPINDAH ke halaman
// baru terpisah, `pages/Report/Growth/index.tsx` (menu "Laporan" > "Growth",
// lihat menu.tsx) — bukan dihapus, lihat task029.md §30.19.
//
// Reuse LANGSUNG komponen chart yang SUDAH ADA (M1CrossSelling/M2AvgCategory
// dari CrossSelling/, M7Expansion dari CustomerMetrics/ — masing-masing
// sudah chart detail + tooltip + drill-down sendiri), BUKAN bikin chart baru
// dari data ringkas /dashboard (percobaan pertama yang salah, 2026-08-19 —
// koreksi user: chart lama sudah ada, jangan dibuat ulang versi simpel).
// M1/M2 dan M7 datang dari 2 hook berbeda (useCrossSelling vs
// useCustomerMetrics, mengikuti sumber data asli masing-masing di halaman
// lamanya) — TIDAK dipaksa jadi 1 fetch.
//
// Permission per-KPI (2026-08-19, perbaikan temuan routeConstants.tsx):
// route ini digate growth:view, TAPI M1/M2 & M7 masing-masing tetap dicek
// independen oleh cross.selling:view/expansion:view di endpoint aslinya —
// section yang permission-nya tidak dimiliki diganti `NoSectionAccess`
// (pola sama persis Retention/index.tsx), bukan disembunyikan total.
export default function Growth() {
  const { t } = useTranslation();
  const can = useCan();
  const canCrossSelling = can('cross.selling:view');
  const canExpansion = can('expansion:view');

  // ─── Filter: quick (auto-apply) vs advanced (staged/draft) — 2026-08-20 ────
  // Koreksi user: quick filter (Entitas+Periode) sempat ikut staged, jadi
  // kelihatan "tidak berfungsi" sebelum klik Terapkan — padahal cuma field di
  // panel Filter Lanjutan (Cabang/Divisi/Granularitas/toggle) yang memang
  // seharusnya nunggu tombol Terapkan. Sekarang: Entitas & Periode LANGSUNG
  // memicu fetch data begitu diganti (bind ke state applied, sama seperti
  // pola auto-apply di semua halaman lain), sisanya tetap staged di draft.
  //
  // scopeFilter & periodTypeFilter di-instantiate 2x (draft + applied) —
  // BUKAN 1x dishare — supaya draftScopeFilter bisa fetch daftar branch/
  // division milik company yang SEDANG dipilih, tanpa ikut mengubah opsi
  // yang dipakai query data yang aktif. Entitas sendiri LEVEL PALING ATAS
  // cascade Company->Branch->Division, jadi begitu diganti (auto-apply) kedua
  // instance disinkronkan bareng lewat quickScopeFilter di bawah — supaya
  // draftScopeFilter (Cabang/Divisi di panel lanjutan) tidak nyangkut di
  // company lama.
  const scopeFilter = useScopedCompanyFilter();
  const draftScopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  // Dipakai KHUSUS oleh field Entitas di quick bar — setCompanyId override
  // supaya applied & draft company selalu sinkron (branchId/division ikut
  // ke-reset otomatis oleh masing-masing hook saat company ganti).
  const quickScopeFilter = {
    ...scopeFilter,
    setCompanyId: (value: number | 'all') => {
      scopeFilter.setCompanyId(value);
      draftScopeFilter.setCompanyId(value);
    },
  };

  const [periodEnd, setPeriodEnd] = useState(todayStr());

  // "Apply date cutoff" (instruksi user 2026-08-20) — default OFF: field
  // Periode cuma pilih bulan+tahun (`type="month"`), karena hari-nya memang
  // TIDAK BERPENGARUH kecuali sedang melihat periode yang masih berjalan
  // (koreksi user: "itu namanya bukan filter tanggal tapi filter bulan/
  // periode"). Checkbox ini AKTIF -> field berubah jadi date picker penuh,
  // DAN mengaktifkan mode SEMUA 12 titik trend dipotong ke hari yang sama
  // (dipakai analisis mis. "20 hari pertama tiap bulan, 12 bulan terakhir")
  // — bukan cuma titik yang sedang berjalan seperti default. periodEnd
  // TETAP disimpan sbg 'YYYY-MM-DD' penuh baik checkbox aktif atau tidak;
  // saat checkbox OFF, tanggalnya dipaksa ke 1 (hari tidak dipakai apa pun).
  const [applyDateCutoff, setApplyDateCutoff] = useState(false);

  // Filter granularitas (§30, 2026-08-20) — SEKARANG dikirim ke useCrossSelling
  // (M1/M2 Cross Selling), backend sudah menerima period_type (§30, contoh
  // KPI 1). M7 Expansion (useCustomerMetrics) BELUM — masih di luar scope
  // "mulai dari KPI 1 dulu", tetap hardcode bulanan sampai giliran M7
  // diimplementasi. Field Tanggal-nya sendiri disembunyikan (showDateField=
  // false) — dipakai Periode di quick filter bar supaya tidak ada 2 date
  // picker terpisah.
  const periodTypeFilter = usePeriodTypeFilter();
  const draftPeriodTypeFilter = usePeriodTypeFilter();

  // Toggle Customer Pareto (§komponen filter global, 2026-08-20) — SAMA seperti
  // Granularitas di atas: baru UI, endpoint M1/M2/M7 belum menerima parameter
  // "only Pareto customer" sama sekali. Nilai applied-nya belum ada consumer
  // (belum ada query yang membacanya) — value-nya sengaja tidak di-destructure
  // (cuma setter yang dipakai handleApplyFilter), tinggal diaktifkan begitu
  // backend menerima parameter ini.
  const [, setOnlyPareto] = useState(false);
  const [draftOnlyPareto, setDraftOnlyPareto] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Salin draft -> applied — CUMA field panel Filter Lanjutan (Cabang/Divisi/
  // Granularitas/toggle). Entitas & Periode TIDAK di sini lagi — sudah
  // auto-apply sendiri lewat quickScopeFilter/setPeriodEnd di atas. Urutan
  // branch->division SENGAJA — draftScopeFilter.setBranchId juga mereset
  // division ke '' di instance draft, dipanggil belakangan biar reset itu
  // KETIMPA nilai draft yang benar (React batching, last-write-wins per
  // state setter dalam 1 handler yang sama).
  const handleApplyFilter = () => {
    scopeFilter.setBranchId(draftScopeFilter.branchId);
    scopeFilter.setDivision(draftScopeFilter.division);
    scopeFilter.setExcludeIntercompany(draftScopeFilter.excludeIntercompany);
    periodTypeFilter.setPeriodType(draftPeriodTypeFilter.periodType);
    setOnlyPareto(draftOnlyPareto);
  };

  // "Reset Filter" — SEMUA field (termasuk Cabang/Divisi/Granularitas/
  // toggle di panel lanjutan) di-reset LANGSUNG ke default, applied DAN
  // draft sekaligus.
  //
  // Susulan (2026-08-22, bug ditemukan user: "reset filter hanya
  // mengembalikan filter ke kondisi semula, tapi tidak dengan filter
  // data nya — contoh filter semester, reset, combo box kembali bulanan
  // tapi data chart masih semester") — sebelumnya cuma DRAFT
  // (`draftPeriodTypeFilter`/`draftScopeFilter.excludeIntercompany`) yang
  // direset, applied state (`periodTypeFilter`/`scopeFilter.
  // excludeIntercompany`, yang beneran dipakai fetch data) TIDAK ikut
  // — combo box kelihatan reset (baca draft) tapi chart masih pakai
  // granularitas lama sampai user klik "Terapkan Filter" lagi sendiri,
  // padahal tombol Reset seharusnya langsung berlaku, bukan perlu 2
  // langkah. Sekarang applied DAN draft direset bareng utk SEMUA field.
  const handleResetFilter = () => {
    scopeFilter.setCompanyId('all');
    draftScopeFilter.setCompanyId('all');
    setPeriodEnd(todayStr());
    scopeFilter.setExcludeIntercompany(false);
    draftScopeFilter.setExcludeIntercompany(false);
    periodTypeFilter.setPeriodType('monthly');
    draftPeriodTypeFilter.setPeriodType('monthly');
    setOnlyPareto(false);
    setDraftOnlyPareto(false);
    // Susulan (2026-08-22, instruksi user: "tombol reset tambahkan fungsi
    // tutup field filter lanjutan") — panel Filter Lanjutan ikut ditutup
    // begitu Reset diklik, bukan cuma isinya yang balik default.
    setAdvancedOpen(false);
  };

  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  // M1 & M2 pakai data yang sama (useCrossSelling), M7 pakai useCustomerMetrics
  // — SEMUA di-fetch sekaligus begitu halaman dibuka (bukan lagi lazy per-tab
  // aktif, sejak tab luar dihapus §30.19), masing-masing tetap `enabled` oleh
  // permission-nya sendiri (canCrossSelling/canExpansion), bukan dipaksa fetch
  // kalau user memang tidak punya akses.
  const { data: csData, isLoading: csLoading } = useCrossSelling({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canCrossSelling });

  const { data: cmData, isLoading: cmLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: canExpansion });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Susulan (2026-08-22, instruksi user: "pindah filter ke sebelah
          kanan sejajar dengan judul halaman") — judul + filter cepat
          (Entitas/Periode/Apply date cutoff/Advanced Filters) DIGABUNG 1
          baris (`justifyContent:'space-between'`, judul kiri filter
          kanan, stack ke kolom di mobile) — pola SAMA PERSIS
          Retention/index.tsx & Value/index.tsx (yang sudah begini dari
          awal), Growth sebelumnya beda sendiri (judul baris terpisah di
          atas filter). */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Typography variant="pageTitle">{t('nav.groups.growth')}</Typography>

        {(canCrossSelling || canExpansion) && (
          /* Filter — SATU instance dipakai bareng semua section KPI di bawah
              (pola sama Retention/Value, bukan lagi "milik" 1 tab aktif sejak
              koreksi user: quick filter sempat tidak berfungsi sebelum klik
              Terapkan — sekarang langsung memicu fetch data begitu diganti).
              Cabang/Divisi/Granularitas + toggle + tombol Terapkan/Reset ada
              di DALAM panel Filter Lanjutan, tetap staged (draft) sampai
              tombol diklik. */
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
            <ScopeFilterFields filter={quickScopeFilter} fields={['entity']} />
            {/* type switch month<->date (instruksi user 2026-08-20) — value
                selalu dikonversi dari/ke periodEnd ('YYYY-MM-DD' penuh, SSOT).
                Mode bulan (checkbox OFF): tampilkan cuma 'YYYY-MM', onChange
                paksa hari ke 1 (hari tidak dipakai kalau bukan mode cutoff). */}
            <DatePicker
              size="small" label={t('common.filters.periodDate')}
              type={applyDateCutoff ? 'date' : 'month'}
              value={applyDateCutoff ? periodEnd : periodEnd.slice(0, 7)}
              onChange={(e) => {
                // clampDateNotFuture (utils/date.ts) — clamp jaga-jaga thd
                // ketik manual > max DAN tombol clear bawaan browser (value
                // kosong, 2026-08-23 laporan user: clear bikin fetch error,
                // seharusnya reset ke hari ini bukan kosong).
                const maxRaw = applyDateCutoff ? todayStr() : todayStr().slice(0, 7);
                const picked = clampDateNotFuture(e.target.value, maxRaw);
                setPeriodEnd(applyDateCutoff ? picked : `${picked}-01`);
              }}
              // max = hari ini — format ikut `type` aktif ('YYYY-MM-DD' mode
              // date, 'YYYY-MM' mode month, keduanya dari 1 sumber `todayStr()`).
              max={applyDateCutoff ? todayStr() : todayStr().slice(0, 7)}
              sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={applyDateCutoff}
                  onChange={(e) => {
                    // Normalisasi periodEnd ke awal bulan saat toggle DIMATIKAN
                    // (2026-08-23, bug ditemukan: hari-nya tersisa dari waktu
                    // toggle masih AKTIF, mis. "2026-08-05" — picker mode bulan
                    // cuma nampilkan "Agustus 2026" jadi kelihatan benar, tapi
                    // value asli masih "05", dipakai APA ADANYA oleh komponen
                    // yang menampilkan tanggal mentah tanpa lewat clamp backend
                    // spt M7ExpansionGrowth, jadi kartunya tampil "s/d 05-08-2026"
                    // padahal M1/M2 benar "23-08-2026" krn baca period.end HASIL
                    // clamp backend, bukan periodEnd mentah).
                    setApplyDateCutoff(e.target.checked);
                    if (!e.target.checked) setPeriodEnd(`${periodEnd.slice(0, 7)}-01`);
                  }}
                />
              }
              label={t('common.filters.applyDateCutoff')}
              sx={{ ml: 0, whiteSpace: 'nowrap' }}
            />
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

      {!canCrossSelling && !canExpansion ? (
        <NoSectionAccess />
      ) : (
        <>
          {/* Collapse (bukan cuma conditional render) — animasi slide
              buka/tutup panel, termasuk baris tombol di dalamnya, sesuai
              instruksi user ("smooth animation untuk appearance button"). */}
          <Collapse in={advancedOpen}>
            {/* borderRadius dihapus (2026-08-22, koreksi user: "filter
                lanjutan jangan rounded, semua layout di aplikasi ini
                tidak ada yang rounded") — konsisten dgn atomic `Card`
                (square:true, sudut tegas di semua tempat lain). */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <ScopeFilterFields filter={draftScopeFilter} fields={['branch', 'division']} />
                {/* showDateField=false — Tanggal cukup dari Periode di quick bar,
                    hindari 2 date picker terpisah untuk 1 konsep tanggal yang sama. */}
                <PeriodTypeFilterFields filter={draftPeriodTypeFilter} showNavigator={false} showDateField={false} />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <ExcludeIntercompanyToggle checked={draftScopeFilter.excludeIntercompany} onChange={draftScopeFilter.setExcludeIntercompany} />
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, my: 0.5 }} />
                <ParetoFilterToggle checked={draftOnlyPareto} onChange={setDraftOnlyPareto} />
              </Box>

              {/* Tombol — kanan-rata di desktop, full width bertumpuk di mobile.
                  mt:2 (16px) dari baris toggle terakhir. Reset = ghost/text abu-abu,
                  Terapkan = primary biru, nunjukin loading saat query KPI aktif
                  sedang fetch ulang (feedback visual klik Terapkan beneran ngerjain
                  sesuatu, bukan cuma diam). */}
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
                  loading={csLoading || cmLoading}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('common.filters.applyFilter')}
                </Button>
              </Box>
            </Box>
          </Collapse>

          {/* Ditumpuk vertikal (§30.19, koreksi user 2026-08-22) — SEMUA KPI
              yang permission-nya dimiliki dirender sekaligus, pola sama
              persis Retention/index.tsx & Value/index.tsx. */}
          {canCrossSelling ? (
            <M1CrossSelling
              data={csData}
              isLoading={csLoading}
              companyId={companyId}
              branchId={resolvedBranchId}
              division={resolvedDivision}
              periodEnd={periodEnd}
              periodType={periodTypeFilter.periodType}
              applyDateCutoff={applyDateCutoff}
              excludeIntercompany={excludeIntercompany}
            />
          ) : (
            <NoSectionAccess />
          )}

          {canCrossSelling ? (
            <M2AvgCategory
              data={csData}
              isLoading={csLoading}
              companyId={companyId}
              branchId={resolvedBranchId}
              division={resolvedDivision}
              periodEnd={periodEnd}
              periodType={periodTypeFilter.periodType}
              applyDateCutoff={applyDateCutoff}
              excludeIntercompany={excludeIntercompany}
            />
          ) : (
            <NoSectionAccess />
          )}

          {canExpansion ? (
            <M7ExpansionGrowth
              trend={cmData?.trend ?? []}
              isLoading={cmLoading}
              companyId={companyId}
              branchId={resolvedBranchId}
              division={resolvedDivision}
              periodEnd={periodEnd}
              // resolvedPeriodEnd (2026-08-23) — tanggal akhir SETELAH
              // resolveTrendPeriod di backend (elapsed-clamp/apply_date_cutoff),
              // BUKAN periodEnd mentah dari filter halaman — dipakai kartu
              // "Existing Customer" supaya konsisten dgn M1/M2 yang baca
              // data.period.end (backend), bukan echo state filter apa adanya.
              resolvedPeriodEnd={cmData?.period.end ?? periodEnd}
              applyDateCutoff={applyDateCutoff}
              periodType={periodTypeFilter.periodType}
              excludeIntercompany={excludeIntercompany}
            />
          ) : (
            <NoSectionAccess />
          )}
        </>
      )}
    </Box>
  );
}
