import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { useCustomerMetrics, useGpBreakdown } from '@/hooks/useMetrics';
import { useGlobalFilter } from '@/context/globalFilter.context';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { Card, StatusChip } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct, sumMonthsInRange } from '@/utils/analisisComparison';
import type { GpBreakdownRow } from '@/types/metrics';

// BUG DITEMUKAN user 2026-08-09 (verifikasi psql langsung): `sumLastMonths(trend,
// periodMonths)` ambil N entri TERAKHIR trend array secara POSISI (mis. quarter
// endDate=9 Agustus → Jun+Jul+Agu, trailing 3 bulan dari BULAN INI), BUKAN
// bulan-bulan yang benar-benar ada di dalam rentang "periodStart..endDate" yang
// ditampilkan di caption ("1 Juli – 9 Agustus" = Jul+Agu, 2 bulan, TANPA Juni).
// Akibatnya kartu/chart diam-diam menyertakan Juni (yang datanya ada) padahal
// caption bilang mulai Juli (yang kosong) — kartu tetap terisi walau seharusnya
// kosong sama seperti tabel. Ganti total: filter trend PER BULAN yang genuinely
// masuk rentang periodStart..endDate (match label & tabel), bukan hitung mundur
// N bulan dari posisi array. `sumMonthsInRange` sekarang dipusatkan di
// `utils/analisisComparison.ts` (2026-08-10) — dipakai juga 8 halaman KPI
// lain yang punya bug sama (laporan user "reactivation rate di dashboard
// dan di KPI tidak sama"), bukan cuma di sini lagi.

function fmtRpDetail(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(2)}jt`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(1)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

type TierKey = 'Atas' | 'Tengah' | 'Bawah';

// 'info' TIDAK dipakai lagi (fixed cyan, tidak ikut palet) — Atas/Tengah
// sama-sama 'primary' (ikut palet), dibedakan dari TEKS labelnya sendiri,
// bukan warna. 'default' (Bawah) sengaja dipertahankan — abu-abu netral di
// sini genuinely melambangkan "tier volume/prioritas rendah" (sesuai kode
// referensi asli juga: badge Long Tail = slate/netral), bukan aksen warna
// yang lupa di-palet-kan.
// Warna KATEGORIKAL 3 tier — koreksi besar user 2026-08-09 (brief lengkap
// "pisahkan peran warna"): warna brand/palet (primary — dipakai di header/
// sidebar/judul) TIDAK BOLEH dipakai lagi utk data/chart, dan hijau
// (success) DIKHUSUSKAN cuma utk makna "naik/baik" (badge growth ▲).
// Sempat di-hardcode indigo/sky/slate (revisi pertama) — TERNYATA salah
// juga: warna jadi statis, tidak ikut palet yang dipilih user di Settings.
// Sempat dipindah ke `theme.custom.data` (revisi kedua, task026 §8s) — juga
// TERNYATA kurang pas: `data` (line1/2/3) dirancang utk 3 metrik LEPAS/tidak
// berurutan (spt chart M3: Avg/Median/Kontribusi HM), sedangkan tier Atas/
// Tengah/Bawah itu BERJENJANG (terurut nilai) — 3 hue lepas terasa "kurang
// mantab"/tidak related utk data berjenjang, dan beberapa palet malah
// tabrakan hue dgn warna semantik (mis. line2 rose = hijau, mirip success).
// Diperbaiki lagi (task026 §8t): pakai `theme.custom.rank[0..2]` — 1 keluarga
// hue brand digradasi kuat→pudar per-palette, khusus utk data berjenjang.
function useTierColors(rank: [string, string, string]) {
  return { top: rank[0], mid: rank[1], bottom: rank[2] };
}

// KPI 4 — Keuntungan dari pelanggan loyal (Average/Total Gross Profit, M4).
// Redesain v2 (2026-08-09, pilot pertama dari 10 KPI, template detail user
// — lihat task026.md §8): badge KPI + judul + deskripsi + kotak total kanan
// atas, 3 kartu tier terpisah, 2 chart (bar periode berjalan + stacked
// tren 12 bulan), tabel dgn filter tier + kolom Revenue/Margin baru
// (backend m4.repository.ts diperluas). periodType TETAP dipertahankan.
export default function CustomerGrossProfit() {
  const { t } = useTranslation();
  const theme = useTheme();

  const scopeFilter = useGlobalFilter();
  const {
    companyId, branchId, division, excludeIntercompany,
    periodType, setPeriodType, endDate, setEndDate,
  } = scopeFilter;
  const todayStr = todayIsoDate();

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate));
  const periodStart = getPeriodDateRange(periodType, periodKey).start;
  const currentRangeText = formatDateRange({ start: periodStart, end: endDate });

  const { data } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: endDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });
  const comparisonDate = (() => {
    const d = new Date(endDate);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const { data: comparisonData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: comparisonDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const trend = data?.trend ?? [];
  const comparisonPeriodStart = shiftDateByYears(periodStart, -1);
  const comparisonRangeText = formatDateRange({ start: comparisonPeriodStart, end: comparisonDate });

  // Total + per-tier — dijumlah PERSIS bulan-bulan yang masuk rentang
  // periodStart..endDate (SAMA dgn caption "1 Juli – 9 Agustus" & tabel
  // breakdown di bawah, lihat catatan sumMonthsInRange di atas). BUKAN pakai
  // `breakdown.total_gp` (window-nya fixed dari business_configs, beda
  // sumber lagi) — angka kartu/chart/tabel sekarang 1 definisi periode yang
  // sama persis.
  const gpTierTopSum    = sumMonthsInRange(trend, periodStart, endDate, (p) => p.gp_tier1);
  const gpTierMidSum    = sumMonthsInRange(trend, periodStart, endDate, (p) => p.gp_tier2);
  const gpTierBottomSum = sumMonthsInRange(trend, periodStart, endDate, (p) => p.gp_tier3);
  const gpTotalSum = gpTierTopSum + gpTierMidSum + gpTierBottomSum;

  const gpTierTopComparison    = sumMonthsInRange(comparisonData?.trend ?? [], comparisonPeriodStart, comparisonDate, (p) => p.gp_tier1);
  const gpTierMidComparison    = sumMonthsInRange(comparisonData?.trend ?? [], comparisonPeriodStart, comparisonDate, (p) => p.gp_tier2);
  const gpTierBottomComparison = sumMonthsInRange(comparisonData?.trend ?? [], comparisonPeriodStart, comparisonDate, (p) => p.gp_tier3);
  const gpTotalComparison = gpTierTopComparison + gpTierMidComparison + gpTierBottomComparison;
  const growthPct = computeChangePct(gpTotalSum, gpTotalComparison) ?? 0;

  const tierColors = useTierColors(theme.custom.rank);

  // Badge kategori (High Margin/Core/Volume) — bukan lagi biru semua
  // (`primary`), dibedakan tapi TETAP netral/tenang (koreksi user: "pill
  // kategori sebaiknya outline/netral, biar badge ▲▼ semantik yang
  // mencolok") — Atas dapat aksen amber lembut (menonjolkan "High Margin"
  // TANPA jadi selebay hijau/merah semantik), Tengah/Bawah netral abu.
  const tierCards: { key: TierKey; labelKey: string; shortLabelKey: string; badgeKey: string; badgeColor: 'warning' | 'default'; value: number; comparisonValue: number; growthPct: number; color: string }[] = [
    { key: 'Atas',   labelKey: 'customerMetrics.m4.tierTop',    shortLabelKey: 'customerMetrics.m4.tierTopShort',    badgeKey: 'customerMetrics.m4.tierTopBadge',    badgeColor: 'warning', value: gpTierTopSum,    comparisonValue: gpTierTopComparison,    growthPct: computeChangePct(gpTierTopSum, gpTierTopComparison) ?? 0,    color: tierColors.top },
    { key: 'Tengah', labelKey: 'customerMetrics.m4.tierMid',    shortLabelKey: 'customerMetrics.m4.tierMidShort',    badgeKey: 'customerMetrics.m4.tierMidBadge',    badgeColor: 'default', value: gpTierMidSum,    comparisonValue: gpTierMidComparison,    growthPct: computeChangePct(gpTierMidSum, gpTierMidComparison) ?? 0,    color: tierColors.mid },
    { key: 'Bawah',  labelKey: 'customerMetrics.m4.tierBottom', shortLabelKey: 'customerMetrics.m4.tierBottomShort', badgeKey: 'customerMetrics.m4.tierBottomBadge', badgeColor: 'default', value: gpTierBottomSum, comparisonValue: gpTierBottomComparison, growthPct: computeChangePct(gpTierBottomSum, gpTierBottomComparison) ?? 0, color: tierColors.bottom },
  ];

  // ── Chart 1: "Periode Berjalan" — 3 tier = 3 SERIES beda warna (indigo/
  // sky/slate) dalam 1 kategori, dikelompokkan berdampingan (grouped bar,
  // BUKAN 1 series monokrom lagi) — koreksi user 2026-08-09: "chart jangan
  // monokrom hijau/1 warna, tiga tier itu kategori berbeda, wajib 3 warna
  // beda". BarChartWidget cuma bisa warnai per-SERIES (bukan per-cell),
  // jadi direstruktur jadi 1 baris data + 3 kolom (top/mid/bottom), bukan
  // 3 baris + 1 kolom seperti sebelumnya — legend otomatis muncul karena
  // series.length > 1. ──
  const periodBarData = [{
    category: t('customerMetrics.m4.periodChartCategoryLabel'),
    top: gpTierTopSum,
    mid: gpTierMidSum,
    bottom: gpTierBottomSum,
  }];

  // Tabel persisten — bound ke endDate, + filter tier (baru).
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierKey | 'all'>('all');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  // date_from = periodStart (task026 §8e, koreksi user 2026-08-09): "window
  // aktif utk parameter existing TIDAK BOLEH berubah, yang berubah PERIODE
  // PENARIKAN DATANYA — end date dari filter, start date dari periode
  // filter". Jadi yang ikut dropdown Periode HANYA rentang tanggal invoice
  // yang di-SUM per existing customer (`date_from`..`endDate`) — SIAPA yang
  // qualify sbg "existing" tetap fixed dari business_configs (TIDAK dikirim
  // dari sini sama sekali, resolveSegmentParams yang urus, lihat backend).
  const { data: breakdown, isLoading: isBreakdownLoading } = useGpBreakdown({
    period_end: endDate,
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
    date_from: periodStart,
  });
  const rows = breakdown?.rows ?? [];
  const filteredRows = rows
    .filter((r) => tierFilter === 'all' || r.tier === tierFilter)
    .filter((r) => !search
      || r.customer_name.toLowerCase().includes(search.toLowerCase())
      || (r.customer_code ?? '').toLowerCase().includes(search.toLowerCase()));

  const tableColumns: GridColDef<GpBreakdownRow>[] = [
    { field: 'customer_code', headerName: t('customerMetrics.m4.colCode'), minWidth: 110, flex: 0.6,
      renderCell: (p) => p.value ?? '—' },
    { field: 'customer_name', headerName: t('customerMetrics.m4.colCustomer'), minWidth: 200, flex: 1.4 },
    { field: 'tier', headerName: t('customerMetrics.m4.colTier'), minWidth: 130, flex: 0.7,
      // Warna badge tier di tabel SAMA persis dgn chart/kartu (indigo/sky/
      // slate) — konsistensi 1 tier = 1 warna di seluruh halaman, bukan cuma
      // di chart (koreksi user 2026-08-09). StatusChip `color` cuma nerima
      // token semantik bawaan, jadi override manual via `sx` (border+text).
      renderCell: ({ row }) => {
        const c = row.tier === 'Atas' ? tierColors.top : row.tier === 'Tengah' ? tierColors.mid : tierColors.bottom;
        return <StatusChip label={row.tier} color="default" sx={{ borderColor: c, color: c }} />;
      } },
    { field: 'revenue', headerName: t('customerMetrics.m4.colRevenue'), minWidth: 160, flex: 0.9,
      valueFormatter: (v: number) => fmtRpDetail(v) },
    { field: 'gp', headerName: t('customerMetrics.m4.colGp'), minWidth: 160, flex: 0.9,
      valueFormatter: (v: number) => fmtRpDetail(v) },
    { field: 'margin_pct', headerName: t('customerMetrics.m4.colMarginPct'), minWidth: 110, flex: 0.6,
      valueFormatter: (v: number) => `${v}%` },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Header: judul + kategori KPI + deskripsi — breadcrumb & chip
          badge KPI (versi lama, berwarna/berbentuk pill) DIHAPUS (koreksi
          user 2026-08-09: "sisakan hanya judul halaman"). Kategori KPI
          ditambah lagi (koreksi user 2026-08-10: "tambahkan kategori KPI
          sebelum sub judulnya") — TAPI sbg baris teks polos kecil (bukan
          chip berwarna spt sebelumnya), diposisikan SEBELUM deskripsi:
          Judul → Kategori KPI → Deskripsi. Kotak Total ada di baris kartu
          di bawah, sejajar Atas/Tengah/Bawah. ── */}
      <Box sx={{ maxWidth: 560 }}>
        <Typography variant="pageTitle" sx={{ display: 'block' }}>{t('customerMetrics.m4.heroTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
          {t('customerMetrics.m4.kpiCategoryLabel')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {t('customerMetrics.m4.pageDescription')}
        </Typography>
      </Box>

      {/* ── Filter bar — periodType TETAP dipertahankan (keputusan user) ── */}
      <KpiFilterBar
        filter={scopeFilter}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetExtra={() => {
          setPeriodType('quarter');
          setEndDate(todayStr);
          setSearch('');
          setTierFilter('all');
        }}
      />

      {/* ── Banner "Detail Periode & Pembanding YoY" — dipusatkan ke
          `PeriodYoyBanner` (2026-08-10, standar 10 halaman KPI), sebelumnya
          JSX inline di sini jadi template acuan 9 halaman lain. ── */}
      <PeriodYoyBanner
        currentRangeText={currentRangeText}
        comparisonRangeText={comparisonRangeText}
        metrics={[{
          baselineValueText: fmtRpDetail(gpTotalComparison),
          deltaValueText: fmtRpDetail(Math.abs(gpTotalSum - gpTotalComparison)),
          growthPct,
        }]}
      />

      {/* ── 4 kartu: Total GP + 3 tier GP (koreksi user 2026-08-10:
          revisi dari "Total Revenue" jadi "Total Gross Profit" — "hapus
          total revenue, yang aku maksud total gross profit, samakan ukuran
          card"). Struktur kartu Total SAMA PERSIS dgn 3 kartu tier (cuma
          tanpa badge kategori) supaya tingginya seragam — reuse
          gpTotalSum/gpTotalComparison/growthPct yang sudah dihitung utk
          banner di atas, bukan hitung ulang. Grid md:3 (4 kolom). ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: theme.palette.primary.main }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: theme.palette.primary.main, display: 'block', mb: 0.5 }}>
              {t('customerMetrics.m4.totalBoxLabel')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{fmtRpDetail(gpTotalSum)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              {t('customerMetrics.m4.totalBoxCaption', { value: fmtRpDetail(gpTierTopSum) })}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
              <StatusChip
                label={`${growthPct >= 0 ? '▲' : '▼'} ${Math.abs(growthPct).toFixed(1)}% ${t('common.filters.vsSamePeriodLastYear')}`}
                color={growthPct >= 0 ? 'success' : 'error'}
              />
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: growthPct >= 0 ? 'success.main' : 'error.main' }}
              >
                {gpTotalSum - gpTotalComparison >= 0 ? '+' : '-'}{fmtRpDetail(Math.abs(gpTotalSum - gpTotalComparison))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('customerMetrics.m4.comparisonValueCaption', { value: fmtRpDetail(gpTotalComparison) })}
              </Typography>
            </Box>
          </Card>
        </Grid>
        {tierCards.map((tc) => (
          <Grid key={tc.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ p: 2, borderLeft: '3px solid', borderLeftColor: tc.color }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: tc.color }}>
                  {t(tc.labelKey)}
                </Typography>
                <StatusChip label={t(tc.badgeKey)} color={tc.badgeColor} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{fmtRpDetail(tc.value)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {t('customerMetrics.m4.tierContributionCaption', { pct: gpTotalSum > 0 ? ((tc.value / gpTotalSum) * 100).toFixed(1) : '0.0' })}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
                <StatusChip
                  label={`${tc.growthPct >= 0 ? '▲' : '▼'} ${Math.abs(tc.growthPct).toFixed(1)}% ${t('common.filters.vsSamePeriodLastYear')}`}
                  color={tc.growthPct >= 0 ? 'success' : 'error'}
                />
                {/* Nilai absolut selisih + nilai tahun lalu APA ADANYA — user
                    tunjukkan langsung: cuma pct+delta bikin harus hitung manual
                    utk tahu angka tahun lalu (2026-08-09), jadi ditampilkan
                    eksplisit, tidak perlu 3.23M − 1.38M sendiri. */}
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: tc.growthPct >= 0 ? 'success.main' : 'error.main' }}
                >
                  {tc.value - tc.comparisonValue >= 0 ? '+' : '-'}{fmtRpDetail(Math.abs(tc.value - tc.comparisonValue))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('customerMetrics.m4.comparisonValueCaption', { value: fmtRpDetail(tc.comparisonValue) })}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── 2 chart berdampingan — PAKAI Grid yang SAMA dgn grid 4-kartu di
          atas (bukan Box flex+width persen — Box flex+gap dan MUI Grid
          menghitung gutter beda cara, tidak align pixel-perfect walau
          angka persennya sama). Koreksi user 2026-08-10 ("chart kiri grid 1,
          kanan 3 grid, lurus dengan atas") — sejak kartu Total (Revenue+GP)
          ditambah jadi 4 kartu (md:3), rasio chart HARUS ikut jadi 3/12 &
          9/12 (1-dari-4 & 3-dari-4) supaya garis grid lurus vertikal dgn
          kartu di atasnya. Sempat ketinggalan di 4/12 & 8/12 (rasio lama
          era 3-kartu) waktu kartu ke-4 ditambah — baru diperbaiki sekarang. ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <BarChartWidget
            title={t('customerMetrics.m4.periodChartTitle')}
            subtitle={`${t('customerMetrics.m4.periodChartSubtitle')} (${currentRangeText})`}
            data={periodBarData}
            series={[
              { key: 'top',    label: t('customerMetrics.m4.tierTopShort'),    color: tierColors.top },
              { key: 'mid',    label: t('customerMetrics.m4.tierMidShort'),    color: tierColors.mid },
              { key: 'bottom', label: t('customerMetrics.m4.tierBottomShort'), color: tierColors.bottom },
            ]}
            xKey="category"
            height={280}
            yAxisFormatter={(v) => fmtRpDetail(v)}
            tooltipFormatter={(v, n) => [fmtRpDetail(v), n]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <BarChartWidget
            title={t('customerMetrics.m4.trendChartTitle')}
            subtitle={t('customerMetrics.m4.trendChartSubtitle')}
            data={trend}
            series={[
              { key: 'gp_tier1', label: t('customerMetrics.m4.tierTop'),    color: tierColors.top },
              { key: 'gp_tier2', label: t('customerMetrics.m4.tierMid'),    color: tierColors.mid },
              { key: 'gp_tier3', label: t('customerMetrics.m4.tierBottom'), color: tierColors.bottom },
            ]}
            xKey="month"
            height={280}
            // 3 bar bersisian per bulan (grouped), BUKAN ditumpuk (koreksi
            // user 2026-08-09: "jika tidak pakai bar tumpuk, tapi 3 bar
            // dalam setiap bulannya bisa?") — `stacked` dihapus (default
            // `BarChartWidget` sudah grouped, lihat prop-nya).
            yAxisFormatter={(v) => fmtRpDetail(v)}
            tooltipFormatter={(v, n) => [fmtRpDetail(v), n]}
          />
        </Grid>
      </Grid>

      {/* ── Tabel breakdown persisten ── */}
      <Card>
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>{t('customerMetrics.m4.tableTitle')}</Typography>
          <Typography variant="caption" color="text.secondary">{t('customerMetrics.m4.tableSubtitle')}</Typography>
        </Box>
        <KpiTableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPaginationModel((p) => ({ ...p, page: 0 })); }}
          searchPlaceholder={t('customerMetrics.m4.searchPlaceholder')}
          totalCountText={t('customerMetrics.m4.customerCountText', { count: filteredRows.length })}
          extraFilter={
            <TextField
              select size="small" value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value as TierKey | 'all'); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">{t('customerMetrics.m4.tierFilterAll')}</MenuItem>
              <MenuItem value="Atas">{t('customerMetrics.m4.tierTop')}</MenuItem>
              <MenuItem value="Tengah">{t('customerMetrics.m4.tierMid')}</MenuItem>
              <MenuItem value="Bawah">{t('customerMetrics.m4.tierBottom')}</MenuItem>
            </TextField>
          }
        />
        <ResponsiveListView
          rows={filteredRows.map((r) => ({ ...r, id: r.ranking }))}
          columns={tableColumns}
          loading={isBreakdownLoading}
          emptyMessage={t('customerMetrics.m4.emptyMessage')}
          mobileFields={['customer_name', 'tier', 'revenue', 'gp', 'margin_pct']}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 25, 50]}
        />
      </Card>
    </Box>
  );
}
