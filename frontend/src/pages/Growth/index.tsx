import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
import { M1CrossSelling } from '../CrossSelling/M1CrossSelling';
import { M2AvgCategory } from '../CrossSelling/M2AvgCategory';
import { M7ExpansionGrowth } from '../CustomerMetrics/M7ExpansionGrowth';

// Growth (task029.md §2, §8-10, §29): M1 Cross Selling, M2 Average Product
// Category, M7 Customer Expansion Rate — sekarang tab per-KPI (§29, ide
// user 2026-08-19), BUKAN ditumpuk vertikal seperti sebelumnya. Cuma 1 blok
// KPI dirender sekaligus (KPI non-aktif unmount total, bukan display:none)
// biar tidak fetch data yang tidak sedang dilihat.
//
// Reuse LANGSUNG komponen chart yang SUDAH ADA (M1CrossSelling/M2AvgCategory
// dari CrossSelling/, M7Expansion dari CustomerMetrics/ — masing-masing
// sudah chart detail + tooltip + drill-down/breakdown sendiri), BUKAN bikin
// chart baru dari data ringkas /dashboard (percobaan pertama yang salah,
// 2026-08-19 — koreksi user: chart lama sudah ada, jangan dibuat ulang versi
// simpel). M1/M2 dan M7 datang dari 2 hook berbeda (useCrossSelling vs
// useCustomerMetrics, mengikuti sumber data asli masing-masing di halaman
// lamanya) — TIDAK dipaksa jadi 1 fetch.
//
// Permission per-KPI (2026-08-19, perbaikan temuan routeConstants.tsx):
// route ini digate growth:view, TAPI M1/M2 & M7 masing-masing tetap dicek
// independen oleh cross.selling:view/expansion:view di endpoint aslinya.
// Tab KPI yang permission-nya tidak dimiliki user TIDAK ditampilkan sama
// sekali (bukan tab kosong + NoSectionAccess) — kalau user tidak punya
// akses ke satupun, baru tampil NoSectionAccess menggantikan tab bar.
type GrowthKpiKey = 'cross_selling_ratio' | 'avg_category' | 'expansion_rate';

export default function Growth() {
  const { t } = useTranslation();
  const can = useCan();
  const canCrossSelling = can('cross.selling:view');
  const canExpansion = can('expansion:view');

  // metric_key dipakai apa adanya sbg value tab & query param `kpi` — sama
  // dengan METRIC_LABEL_KEYS (metricFormat.ts) & metric.link dari backend,
  // biar nanti kartu Overview bisa deep-link langsung ke sini tanpa mapping
  // tambahan (§29.3).
  const availableKpis: GrowthKpiKey[] = [
    ...(canCrossSelling ? (['cross_selling_ratio', 'avg_category'] as const) : []),
    ...(canExpansion ? (['expansion_rate'] as const) : []),
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedKpi = searchParams.get('kpi');
  const activeKpi: GrowthKpiKey | null =
    requestedKpi && availableKpis.includes(requestedKpi as GrowthKpiKey)
      ? (requestedKpi as GrowthKpiKey)
      : (availableKpis[0] ?? null);

  const handleTabChange = (_: React.SyntheticEvent, value: GrowthKpiKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('kpi', value);
      return next;
    }, { replace: true });
  };

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

  // "Reset Filter" (2026-08-20) — Entitas & Periode (auto-apply) di-reset
  // LANGSUNG ke default (konsisten dengan sifatnya yang instan, bukan
  // nunggu Terapkan). Cabang/Divisi/Granularitas/toggle di panel lanjutan
  // cuma reset DRAFT-nya — user tetap harus klik "Terapkan Filter" sendiri
  // kalau memang mau default itu benar-benar dipakai ke chart.
  const handleResetFilter = () => {
    scopeFilter.setCompanyId('all');
    draftScopeFilter.setCompanyId('all');
    setPeriodEnd(todayStr());
    draftScopeFilter.setExcludeIntercompany(false);
    draftPeriodTypeFilter.setPeriodType('monthly');
    setDraftOnlyPareto(false);
  };

  const resolvedBranchId = branchId === 'all' ? undefined : branchId;
  const resolvedDivision = division || undefined;

  // M1 & M2 pakai data yang sama (useCrossSelling) — fetch sekali kalau
  // salah satu dari 2 tab itu aktif, bukan re-fetch tiap pindah M1<->M2.
  const needsCsData = activeKpi === 'cross_selling_ratio' || activeKpi === 'avg_category';
  const needsCmData = activeKpi === 'expansion_rate';

  const { data: csData, isLoading: csLoading } = useCrossSelling({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    apply_date_cutoff: applyDateCutoff,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: needsCsData });

  const { data: cmData, isLoading: cmLoading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: resolvedBranchId,
    period_end: periodEnd,
    period_type: periodTypeFilter.periodType,
    division: resolvedDivision,
    exclude_intercompany: excludeIntercompany,
  }, { enabled: needsCmData });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Urutan (2026-08-20, instruksi user): Judul -> Tab KPI -> Filter -> konten
          KPI aktif. Tab dinaikkan langsung di bawah judul (bukan di bawah
          filter seperti sebelumnya), filter dipindah ke bawah tab bar supaya
          terlihat "milik" tab yang sedang aktif (walau state filter-nya tetap
          1, dipakai bareng semua tab — cuma soal penempatan visual). */}
      <Typography variant="pageTitle">{t('nav.groups.growth')}</Typography>

      {activeKpi === null ? (
        <NoSectionAccess />
      ) : (
        <>
          {/* Tab bar level halaman — 1 tab = 1 KPI (§29). variant="fullWidth"
              (2026-08-20, instruksi user: "grid col 3 agar sama lebar") — tiap
              tab dapat lebar sama rata mengisi baris, bukan scrollable
              menyesuaikan panjang teks (yang bikin tab ke-3 sempat kepotong
              di mobile). sx eksplisit sama dengan tab Analysis/Breakdown di
              dalam tiap KPI (M1CrossSelling.tsx): cuma underline indicator
              standar, TANPA fill/background di tab aktif. */}
          <Tabs
            value={activeKpi}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { bgcolor: 'transparent', textTransform: 'none' },
              '& .MuiTab-root.Mui-selected': { bgcolor: 'transparent' },
            }}
          >
            {/* Label tab pakai varian Short (metrics.json) — 2026-08-20, koreksi
                user: label penuh ("Tingkat Ekspansi Pelanggan" dkk) kepanjangan,
                tab ke-3 sampai tidak kelihatan di scrollable tab bar mobile. */}
            {canCrossSelling && <Tab value="cross_selling_ratio" label={t('metrics.crossSellingShort')} />}
            {canCrossSelling && <Tab value="avg_category" label={t('metrics.avgCategoryShort')} />}
            {canExpansion && <Tab value="expansion_rate" label={t('metrics.expansionShort')} />}
          </Tabs>

          {/* Filter — di bawah tab bar, tampil di setiap tab KPI. Quick bar
              (Entitas + Periode) SELALU tampil, AUTO-APPLY (2026-08-20,
              koreksi user: quick filter sempat tidak berfungsi sebelum klik
              Terapkan — sekarang langsung memicu fetch data begitu diganti).
              Cabang/Divisi/Granularitas + toggle + tombol Terapkan/Reset ada
              di DALAM panel Filter Lanjutan, tetap staged (draft) sampai
              tombol diklik. */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <ScopeFilterFields filter={quickScopeFilter} fields={['entity']} />
            {/* type switch month<->date (instruksi user 2026-08-20) — value
                selalu dikonversi dari/ke periodEnd ('YYYY-MM-DD' penuh, SSOT).
                Mode bulan (checkbox OFF): tampilkan cuma 'YYYY-MM', onChange
                paksa hari ke 1 (hari tidak dipakai kalau bukan mode cutoff). */}
            <DatePicker
              size="small" label={t('common.filters.periodDate')}
              type={applyDateCutoff ? 'date' : 'month'}
              value={applyDateCutoff ? periodEnd : periodEnd.slice(0, 7)}
              onChange={(e) => setPeriodEnd(applyDateCutoff ? e.target.value : `${e.target.value}-01`)}
              sx={{ width: { xs: '100%', sm: FILTER_FIELD_WIDTH } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={applyDateCutoff}
                  onChange={(e) => setApplyDateCutoff(e.target.checked)}
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

          {/* Collapse (bukan cuma conditional render) — animasi slide
              buka/tutup panel, termasuk baris tombol di dalamnya, sesuai
              instruksi user ("smooth animation untuk appearance button"). */}
          <Collapse in={advancedOpen}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
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
                  loading={needsCsData ? csLoading : cmLoading}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('common.filters.applyFilter')}
                </Button>
              </Box>
            </Box>
          </Collapse>

          {activeKpi === 'cross_selling_ratio' && (
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
          )}

          {activeKpi === 'avg_category' && (
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
          )}

          {activeKpi === 'expansion_rate' && (
            <M7ExpansionGrowth
              trend={cmData?.trend ?? []}
              isLoading={cmLoading}
              companyId={companyId}
              branchId={resolvedBranchId}
              division={resolvedDivision}
              periodEnd={periodEnd}
              periodType={periodTypeFilter.periodType}
              excludeIntercompany={excludeIntercompany}
            />
          )}
        </>
      )}
    </Box>
  );
}
