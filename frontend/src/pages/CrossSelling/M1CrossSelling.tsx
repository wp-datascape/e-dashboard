import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import GridOnIcon from '@mui/icons-material/GridOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import type { TooltipContentProps } from 'recharts';

import { ComboChartWidget } from '@/components/charts/ComboChartWidget';
import { HeatmapWidget } from '@/components/charts/HeatmapWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Dialog, Card } from '@/components/ui';
import { StatusChip } from '@/components/ui/StatusChip';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { useCustomerProducts } from '@/hooks/useProducts';
import { useCrossSelling } from '@/hooks/useMetrics';
import { formatRupiah } from '@/utils/format';
import { formatDateID } from '@/utils/date';
import {
  shiftDateByYears, formatPeriodLabel, formatPeriodLabelShort,
  getCurrentPeriodKey, getYoyPeriodKey, getMomComparisonPeriodEnd,
} from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import type { CrossSellingData, CrossSellingTrendPoint } from '@/types/metrics';
import { SectionLabel, KpiCard } from './HelperComponents';
import { relabelCategory } from './helpers';

// M1 (Cross Selling Ratio, task029.md §8.1 + §28) — restrukturisasi
// 2026-08-21 (permintaan user, KHUSUS M1 — KPI lain TETAP pakai pola
// Analysis/Breakdown §28, TIDAK di-supersede): dari 2 tab (Analysis/
// Breakdown) jadi 3 sub-tab:
//   Overview      — mini trend chart + top 10 customer by category count
//                   (ringkasan cepat, bukan fetch baru — subset data.trend/
//                   data.detail yang SUDAH ada).
//   Trend Analysis — chart tren penuh (sama seperti Analysis lama) + tabel
//                   Breakdown penuh (sama seperti Breakdown lama, sekarang
//                   digabung 1 tab).
//   Heatmap        — M1.1 heatmap Customer × Product Category, sekarang
//                   tab sendiri (dulu nempel di bawah trend chart di
//                   Analysis).
// KPI Header (current/YoY/change) TETAP selalu tampil DI ATAS ketiga
// sub-tab (bukan pindah ke dalam Overview) — keputusan eksplisit user.
//
// Susulan (2026-08-22, koreksi user: "terlalu kotor jika chart digabung
// dengan tabel", + "kembalikan ke kondisi UI awal" — tab luar Growth
// dihapus, lihat Growth/index.tsx) — `<BreakdownTable>` yang tadinya
// nempel PERMANEN di tab Trend Analysis DIPINDAH ke halaman baru
// Laporan > Growth (`pages/Report/Growth/index.tsx`), BUKAN dihapus.
// `BreakdownTable.tsx` (komponennya sendiri) TIDAK berubah, cuma
// dipanggil dari tempat baru dengan fetch `useCrossSelling` sendiri.
//

// Chart UTAMA (bar Active/Multi-Category + line Cross Sell Rate) TIDAK
// diubah — koreksi user 2026-08-19: kombinasi ini sudah penuhi prinsip
// §28.4 (line = trend KPI-nya), bar cuma konteks volume tambahan, bukan
// alasan buat diganti ke Line/Area murni. Dipakai ulang di versi mini
// (Overview) DAN penuh (Trend Analysis), cuma beda height.
//
// Tabel Breakdown pakai data.detail (SUDAH ada dari fetch utama, tidak
// perlu fetch baru). SEMUA kolom §28.10 SUDAH lengkap (2026-08-21): Branch/
// Division/Channel dari invoice terbaru customer DI DALAM periode
// (`fetchCrossSellingDetail`, backend), YoY Category Count/Category
// Change/Revenue YoY/Cross Sell Status dari `yoyData` yang SUDAH di-fetch
// (period_end -1 tahun, awalnya cuma buat KpiHeader) — TIDAK perlu fetch
// baru lagi. Kolom ID Pelanggan (customer_code) DIHAPUS dari tabel ini
// (permintaan user) — field-nya TETAP ada di data (dipakai search), cuma
// tidak ditampilkan sbg kolom; M2 (`M2AvgCategory.tsx`) py tabel sendiri,
// TIDAK disentuh, masih tampilkan customer_code.
function M1Tooltip({ active, payload }: TooltipContentProps<number, string>) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CrossSellingTrendPoint;
  const singleCategory = d.total_active - d.multi_product;

  return (
    <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, p: 1.5, minWidth: 230, fontSize: 12 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        {t('crossSelling.m1TooltipTitle', { month: d.month })}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipCrossSellingCustomers')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.multi_product}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipSingleCategory')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{singleCategory}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipExistingCustomers')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.total_active}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipCrossSellRate')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.ratio.toFixed(1)}%</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">{t('crossSelling.m1TooltipAvgCategories')}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.avg_category.toFixed(2)}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

interface Props {
  data: CrossSellingData | undefined;
  isLoading: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  periodEnd: string;
  /** Granularitas trend/KPI Header (task029.md §30, 2026-08-20) — default 'monthly'
   * kalau caller belum kirim (Retention/Value masih pola lama, cuma Growth/M1 yang
   * sudah wired ke filter Granularitas). */
  periodType?: PeriodGranularity;
  /** Mode "Apply date cutoff" (task029.md §30, 2026-08-20) — SEMUA titik trend
   * dipotong ke hari yang sama, bukan cuma titik yang sedang berjalan. Diteruskan
   * ke fetch YoY di bawah juga, biar KpiHeader current & pembanding tetap sinkron
   * (kalau OFF, pembanding pakai default clampToElapsedEnd seperti biasa). */
  applyDateCutoff?: boolean;
  excludeIntercompany?: boolean;
}

export function M1CrossSelling({ data, isLoading, companyId, branchId, division, periodEnd, periodType = 'monthly', applyDateCutoff = false, excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  // periodEnd diparse manual (BUKAN `new Date(periodEnd)`) — komponen Date
  // lokal eksplisit (y,m,d), hindari pergeseran timezone dari parse string
  // ISO (pola sama dgn backend metrics.service.ts). periodKey/yoyPeriodKey
  // dipakai utk label — nilai AKTUAL yang benar-benar dipakai backend tetap
  // `data.period.key` (echo dari response), ini cuma buat YoY comparisonLabel
  // sebelum data YoY datang.
  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd));
  const yoyPeriodKey = getYoyPeriodKey(periodType, periodKey);
  const yoyPeriodEnd = shiftDateByYears(periodEnd, -1);
  // Label periode SEKARANG eksplisit (koreksi user 2026-08-21: "jangan
  // pakai periode ini, harus keterangan eksplisit" — KpiHeader dulu pakai
  // teks generik "periode ini", sekarang label periode BENERAN, mis.
  // "Kuartal 3 Tahun 2026", pola sama dgn yoyComparisonLabel).
  const currentPeriodLabel = formatPeriodLabel(periodType, periodKey);
  const yoyComparisonLabel = formatPeriodLabel(periodType, yoyPeriodKey);
  const periodUnit = t(`dashboard.periodUnit.${periodType}`);

  // Header Current/YoY/Change (task029.md §28.2) — fetch terpisah, endpoint
  // sama cuma period_end digeser -1 tahun (pola sama dgn drill-down dialog).
  // period_type diteruskan juga (§30) — backend independen menghitung
  // periodKey-nya sendiri dari periode_end yang sudah digeser, otomatis
  // menghasilkan "Q3 2025" kalau current-nya "Q3 2026", dst.
  const { data: yoyData } = useCrossSelling({
    company_id: companyId,
    branch_id: branchId,
    period_end: yoyPeriodEnd,
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  // Fetch MoM (task029.md §31, 2026-08-23, koreksi user: "Top 5 M1, M2 itu
  // pakai MoM seperti Top 5 di M7" — basis pembanding panah tren Top 5
  // DIUBAH dari YoY jadi periode LANGSUNG SEBELUMNYA, granularitas-aware,
  // supaya konsisten dgn Top Movers M7 yang sudah MoM). `yoyData` di atas
  // TETAP dipertahankan (masih dipakai KpiHeader, itu TETAP YoY sesuai
  // keputusan user — cuma Top 5 yang basisnya ganti, bukan seluruh halaman).
  const { data: momData } = useCrossSelling({
    company_id: companyId,
    branch_id: branchId,
    period_end: getMomComparisonPeriodEnd(periodType, periodEnd),
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  // ─── M1.1 Drill-down (klik sel heatmap customer × kategori) ─────────────────
  const [productDrill, setProductDrill] = useState<{ customerId: number; customerName: string; itemType: string; itemLabel: string } | null>(null);
  // period_start/period_end (2026-08-22, bug dilaporkan user: "tidak sesuai
  // dengan filter, bulanan, kuartalan, semesteran, tahunan") — dulu pakai
  // period_month+active_window (window bulan-mundur fixed, TIDAK terkait
  // filter granularitas halaman), sekarang pakai LANGSUNG data.period.start/
  // end — rentang yang SAMA PERSIS dipakai heatmap-nya sendiri untuk hitung
  // sel yang diklik, granularitas-aware otomatis (Bulanan/Kuartalan/
  // Semesteran/Tahunan).
  const { data: productData, isLoading: productLoading } = useCustomerProducts(
    productDrill
      ? {
          company_id:    companyId,
          customer_id:   productDrill.customerId,
          item_type:     productDrill.itemType,
          branch_id:     branchId,
          division,
          period_start: data?.period.start,
          period_end:   data?.period.end,
          exclude_intercompany: excludeIntercompany,
          per_page: 100,
        }
      : null,
  );

  // Ringkasan drill-down (2026-08-22, koreksi user: "informasi juga kurang
  // lengkap, total produk, total invoice, total revenue, total GP") — dari
  // `meta.summary` (agregat KESELURUHAN hasil filter, backend query
  // terpisah dari daftar produk per-halaman) — pola SAMA PERSIS
  // `CategoryProductsDialog.tsx` (products.pages), cast generic
  // `Record<string, unknown>` ke shape yang diketahui.
  const productSummary = productData?.meta.summary as Partial<{
    product_count: number;
    total_revenue: number;
    total_gp: number;
    invoice_count: number;
  }> | undefined;

  const productColumns: GridColDef[] = [
    { field: 'product_name', headerName: t('crossSelling.m11ColProduct'), flex: 1, minWidth: 180, sortable: false },
    { field: 'total_revenue', headerName: t('crossSelling.m11ColRevenue'), width: 130, type: 'number', sortable: false, valueFormatter: (v: number) => formatRupiah(v) },
    { field: 'total_gp', headerName: t('crossSelling.m11ColGp'), width: 120, type: 'number', sortable: false, valueFormatter: (v: number) => formatRupiah(v) },
    { field: 'gp_margin_percent', headerName: t('crossSelling.m11ColMargin'), width: 90, sortable: false, renderCell: (p) => `${p.value}%` },
    { field: 'invoice_count', headerName: t('crossSelling.m11ColInvoice'), width: 90, type: 'number', sortable: false },
  ];

  // Tabel Breakdown (task029.md §28.10) DIPINDAH ke komponen shared
  // `BreakdownTable.tsx` (2026-08-21) — dipakai M1 DAN M2 sekarang ("M1
  // jadi standar layout default"), bukan kode lokal per halaman lagi.

  // Overview tab — top 5 customer by TOTAL REVENUE (koreksi user 2026-08-21,
  // dari top 10 by category count -> top 10 by revenue -> top 5 by revenue).
  // SELALU top-5-by-revenue, TIDAK ikut breakdownSearch/Sort (state itu
  // punya Trend Analysis tab) — subset data.detail yang SUDAH ada, bukan
  // fetch baru. List view sederhana (BUKAN ResponsiveListView/DataGrid,
  // permintaan user) — rank + nama + revenue saja, detail lengkap (category
  // count, per-tipe produk) tetap di tabel Breakdown penuh (Trend Analysis).
  const overviewTopCustomers = useMemo(
    () => [...(data?.detail ?? [])].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5),
    [data?.detail],
  );

  // Susulan (2026-08-22, koreksi user: "letakkan top 5 customer list
  // disamping chart... Nama dan Persentase Kontribusi") — list-nya PINDAH
  // dari section terpisah jadi kolom samping chart utama (70/30), formatnya
  // ganti dari revenue mentah jadi persentase kontribusi thd total revenue
  // SEMUA customer aktif periode itu (bukan cuma total top-5, biar
  // persentase benar-benar "porsi dari keseluruhan").
  const totalRevenueAll = useMemo(
    () => (data?.detail ?? []).reduce((sum, r) => sum + r.total_revenue, 0),
    [data?.detail],
  );

  // Icon tren (2026-08-22, instruksi user: "tambahkan icon trend ↗↘→ di
  // top 5 customer") — REUSE pola persis `BreakdownTable.tsx`
  // (`yoyByCustomer`/`crossSellStatus`, category_count vs yoyData) alih-alih
  // bikin logic baru — cross-sell TREND yang relevan buat panel ini adalah
  // category_count (bukan revenue), sama definisi dgn tabel Breakdown.
  //
  // Basisnya MoM sekarang (2026-08-23, task029.md §31), BUKAN lagi YoY —
  // baca `momData` (fetch baru di atas), bukan `yoyData`.
  const momCategoryCountByCustomer = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of momData?.detail ?? []) map.set(r.customer_id, r.category_count);
    return map;
  }, [momData?.detail]);

  // Susulan (2026-08-22, instruksi user: "untuk heatmap, buat layout
  // seperti cross selling nya" — 3 KPI card di atas Heatmap M1.1, pola
  // SAMA PERSIS Section 1 di atas chart). Scope datanya BEDA dari
  // KpiCard M1 di atas (yang cakupannya SEMUA customer aktif) — di sini
  // scope-nya cuma 30 customer yang tampil di heatmap (`data.heatmap`,
  // backend sudah batasi top-30 by revenue), jadi 3 KPI-nya scoped ke
  // situ juga, BUKAN duplikat angka yang sama:
  // 1. Total Revenue (Top 30) + % dari total revenue semua customer aktif.
  // 2. Rata-rata Kategori/Customer, dihitung ulang khusus dari 30 baris
  //    heatmap (BEDA dari kpi2.avg_categories yang basisnya SEMUA customer).
  // 3. Kategori Terpopuler — kategori dgn jumlah customer pembeli terbanyak
  //    di antara 30 baris itu.
  const heatmapRows = useMemo(() => data?.heatmap ?? [], [data?.heatmap]);
  const heatmapTotalRevenue = useMemo(
    () => heatmapRows.reduce((sum, r) => sum + r.total_revenue, 0),
    [heatmapRows],
  );
  const heatmapAvgCategories = useMemo(() => {
    if (heatmapRows.length === 0) return 0;
    const totalCats = heatmapRows.reduce((sum, r) => sum + Object.values(r.values).filter((v) => v > 0).length, 0);
    return totalCats / heatmapRows.length;
  }, [heatmapRows]);
  const heatmapTopCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of heatmapRows) {
      for (const [cat, qty] of Object.entries(row.values)) {
        if (qty > 0) counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [cat, count] of counts) {
      if (count > bestCount) { bestKey = cat; bestCount = count; }
    }
    return bestKey ? { label: relabelCategory(t)(bestKey), count: bestCount } : null;
  }, [heatmapRows, t]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Susulan (2026-08-22, instruksi user: "tambahkan 3 card summary
          diatas chart cross selling") — REUSE `KpiCard` + i18n keys yang
          SUDAH ADA & sudah teruji dari halaman lama `CrossSelling/index.tsx`
          (route orphan, task029.md §30.19/30.15 — kode & terjemahannya
          TIDAK dihapus, cuma dipakai ulang di sini), BUKAN bikin komponen
          baru — pola sama persis 3 kartu yang dulu tampil di page itu
          (Cross-Sell Rate/Avg Category/Active Customers). Prefix "KPI 1 ·"/
          "KPI 2 ·" di label dihapus (konsisten dgn keputusan "hapus prefix
          M-angka" §30.21 yang berlaku lebih luas dari sekadar SectionLabel).

          Susulan lanjutan (2026-08-22, instruksi user "hapus card cross
          sale rate" — SEMPAT dihapus dari sini, tapi user koreksi:
          "bukan itu, kembalikan, maksudku yang dibawah chart" — kartu
          KPI Cross-Selling Rate di SINI DIKEMBALIKAN lagi, 3 kartu utuh.
          Yang dimaksud user itu footer "Cross-Sell Rate" (TrendSummary)
          di bawah chart, lihat DIHAPUS di bawah). */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi1Label')}
              value={`${data?.kpi1.rate ?? 0}%`}
              sub={t('crossSelling.kpi1Sub', { multi: data?.kpi1.multi_cat_count ?? 0, active: data?.kpi1.active_count ?? 0 })}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi2Label')}
              value={data?.kpi2.avg_categories ?? 0}
              // unit: periodUnit, BUKAN activeWindow (2026-08-22, koreksi
              // user: "teks ini masih hardcode" — sama pola kayak
              // activeCustomerLabel, total_distinct_cats DIHITUNG dari
              // periodStart/periodEnd granularitas-aware (m1.repository.ts,
              // CTE `inv` yang sama dgn active_count), bukan activeWindow.
              sub={t('crossSelling.kpi2Sub', { distinct: data?.kpi2.total_distinct_cats ?? 0, unit: periodUnit })}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              // label TANPA "({{months}} bulan)" lagi (2026-08-22, koreksi
              // user: "teks ini masih hardcode") — `active_count` DIHITUNG
              // dari periodStart/periodEnd granularitas-aware (m1.repository.ts
              // fetchCrossSellingKPI, SAMA dgn heatmap), BUKAN dari
              // `activeWindow`/`active_months` (itu window kualifikasi
              // "existing customer", konsep beda) — label lama salah nyebut
              // window ("1 bulan") padahal utk Kuartalan/Semesteran/Tahunan
              // datanya scope-nya BUKAN 1 bulan. Info periode akurat SUDAH
              // ada di `sub` di bawah, tidak perlu diulang di label.
              label={t('crossSelling.activeCustomerLabel')}
              value={data?.kpi1.active_count ?? 0}
              // formatDateID (2026-08-22, koreksi user: "perbaiki formating
              // penulisan tanggal lokal ID pakai util yang ada") — dulu
              // period.start/end (raw 'YYYY-MM-DD') dilempar mentah ke
              // teks, sekarang DD-MM-YYYY, pola sama persis heatmapHelperText
              // di bawah (util yang SAMA, sudah diimpor di file ini).
              sub={t('crossSelling.activeCustomerSub', {
                start: data?.period.start ? formatDateID(data.period.start) : '—',
                end: data?.period.end ? formatDateID(data.period.end) : '—',
              })}
              color={theme.palette.success.main}
            />
          )}
        </Grid>
      </Grid>

      {/* Susulan (2026-08-22, koreksi user: "Jadikan 1 layout dengan chart
          cross selling sebagai header chart seperti konsep awal begitu
          juga untuk card dibawah chart jadikan footer chart") — merujuk
          §28.11 task029.md "Struktur Final Setiap KPI Card": 1 Card
          berisi Header (judul+KpiHeader) -> Divider -> Chart (body) ->
          Divider -> Footer (TrendSummary), BUKAN 3 elemen terpisah
          (KpiHeader teks lepas + chart + TrendSummary card sendiri) spt
          sebelumnya.

          Susulan lanjutan (2026-08-22, koreksi user via anotasi screenshot
          §30.24) — 2 judul redundan DIHAPUS ("Cross-Sell Rate" dari
          KpiHeader, "Tren Cross-Selling (12 bulan)" dari ComboChartWidget)
          krn keduanya cuma mengulang judul utama card ini (SectionLabel di
          atas) — "cukup judul utama card". Header region SEKARANG cuma
          judul utama; KpiHeader (baris perbandingan periode, TANPA judul
          metrik) PINDAH ke body, tepat di atas chart, menggantikan posisi
          subtitle chart yang lama (instruksi: "gantikan posisi kotak
          kuning atas dengan kotak hijau"). Subtitle chart lama ("Bar =
          ... Line = ...") PINDAH jadi `caption` (dirender di BAWAH chart,
          gabung dgn legend recharts — instruksi: "satukan ke 2 kotak
          kuning ke bawah chart", keduanya sama-sama legend, jangan
          dipisah atas-bawah).

          Susulan lanjutan lagi (2026-08-22, instruksi user: "meletakkan
          top 5 customer list disamping cart [chart]... apus juga mini
          cart ringkasan 12 bulan") — section terpisah SummaryCard grid
          2x2 + mini AreaChartWidget + Top Customers (dulu di bawah Card
          ini) DIHAPUS TOTAL (kontennya sudah dicover Section 1 KPI row di
          atas + Top Customers di bawah ini). Top 5 Customers PINDAH jadi
          kolom samping chart utama (grid 70/30), format Nama + Persentase
          Kontribusi (bukan lagi revenue mentah). Susulan ini SEKALIGUS
          memperbaiki bug: ada blok ComboChartWidget+TrendSummary
          DUPLIKAT (sisa refactor §30.23 yang lupa dihapus) yang render 2x
          chart yang sama persis — sekarang cuma 1. */}
      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SectionLabel label={t('crossSelling.m1FullLabel', { unit: periodUnit })} icon={SwapHorizIcon} />
            <MuiTooltip
              title={t('crossSelling.chart1Subtitle', { unit: periodUnit })}
              placement="top"
              arrow
              // whiteSpace: pre-line (2026-08-22, koreksi user: "tidak bisa
              // dipahami, perhatikan paragraf nya" — teksnya sekarang py \n
              // per baris di i18n, tapi tanpa pre-line browser
              // collapse jadi 1 paragraf run-on lagi) — render tiap baris
              // definisi ("Bar abu-abu = ...", "Bar biru = ...", "Garis =
              // ...") sbg baris terpisah, bukan 1 kalimat panjang.
              slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
            >
              <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                <InfoOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        <Box sx={{ p: 2.5 }}>
          {/* CSS Grid manual (sx display:'grid') DIGANTI komponen `<Grid>`
              MUI (2026-08-24, instruksi user: "gabisa pakai grid col
              responsive? pakai context7" — dicek dokumentasi resmi MUI,
              pola `<Grid container><Grid size={{xs,md}}>` inilah yang
              sudah dipakai konsisten di seluruh proyek ini, termasuk 3
              KpiCard heatmap persis di bawah section ini — BUKAN CSS Grid
              tulisan tangan via sx yang berulang kali bermasalah di mobile
              beberapa iterasi terakhir). `minWidth: 0` tetap dipasang di
              kolom chart sbg jaga-jaga (flex item MUI Grid v2 tetap bisa
              kena default `min-width:auto` browser). */}
          <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={360} />
          ) : (
            <ComboChartWidget
              // headerContent (2026-08-22, koreksi keras user: "pindahkan
              // text ini ke container chart bukan diluarnya") — KpiHeader
              // (baris perbandingan periode) SEBELUMNYA render sbg
              // sibling SEBELUM <ComboChartWidget>, jadi visualnya di
              // LUAR border/background Card widget ini (cuma di dalam
              // Card UNIFIED yang lebih besar). Sekarang dikirim lewat
              // prop `headerContent`, dirender DI DALAM Card widget ini
              // sendiri, di posisi title/subtitle (atas, sebelum chart).
              headerContent={
                <KpiHeader
                  current={data?.kpi1.rate ?? 0}
                  yoy={yoyData?.kpi1.rate ?? 0}
                  kpiType="rate"
                  currentPeriodLabel={currentPeriodLabel}
                  comparisonLabel={yoyComparisonLabel}
                />
              }
              // caption dihapus (2026-08-22, koreksi user: "hapus kotak
              // kuning") — teks "Bar = ... Line = ..." dianggap
              // redundan/tidak perlu, legend recharts (warna+nama
              // series) sudah cukup menjelaskan sendiri.
              data={data?.trend ?? []}
              barKey="total_active"
              barLabel={t('crossSelling.seriesActiveCustomers')}
              // Susulan (2026-08-22, koreksi user: "warna nya tidak
              // terlihat di mode terang background putih") — opacity
              // mode terang dinaikkan 0.30 -> 0.6 (warna basis SAMA,
              // cuma kurang pekat sebelumnya) — legend recharts
              // mewarnai TEKS label pakai warna fill series ini juga,
              // jadi opacity rendah bikin tulisan "Pelanggan Aktif" di
              // legend nyaris tak kebaca di background putih.
              barColor={theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.6)'}
              bar2Key="multi_product"
              bar2Label={t('crossSelling.seriesMultiCategory')}
              bar2Color={theme.palette.primary.main}
              lineKey="ratio"
              lineLabel={t('crossSelling.seriesCrossSellRateShort')}
              lineColor={theme.palette.info.main}
              formatLine={(v) => `${v}%`}
              xKey="month"
              height={280}
              xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
              renderTooltip={(props) => <M1Tooltip {...props} />}
            />
          )}
          </Grid>

          {/* display:flex + flexDirection:'column' (2026-08-24, instruksi
              user: "tombol Cek Detail pojok kanan bawah tanpa merusak
              layout") — grid item ini adalah flex-item baris `<Grid
              container>` di atas, browser default `align-items:stretch`
              MUI Grid v2 SUDAH membuatnya setinggi kolom chart di sebelah
              (desktop, md+) tanpa perlu height:100%/percentage manual
              apa pun. mt:'auto' di Box tombol tinggal manfaatkan sisa
              ruang stretch itu utk dorong ke bawah — TIDAK menyentuh
              tinggi/ukuran ComboChartWidget sama sekali (chart height
              fixed piksel, bukan persentase). Di mobile (xs), kolom ini
              row TERPISAH (bukan stretch bareng chart), mt:'auto' otomatis
              tidak berefek — tombol tetap menempel wajar di bawah list. */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <Box>
                <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SectionLabel label={t('crossSelling.m1OverviewTopCustomersLabel')} />
                  {/* Info tooltip basis pembanding (2026-08-23, task029.md
                      §31, instruksi user: "berikan icon informasi dengan
                      tooltip bahwa pembanding nya periode sebelumnya") —
                      pola sama persis info tooltip M2 chart title. */}
                  <MuiTooltip
                    title={t('crossSelling.topCustomersComparisonInfo')}
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                  >
                    <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                      <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </MuiTooltip>
                </Box>
                {overviewTopCustomers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{t('crossSelling.m2EmptyMessage')}</Typography>
                ) : (
                  // Susulan (2026-08-22, instruksi user: "rubah layoutnya
                  // menjadi model timeline tanpa tabel") — dari daftar
                  // baris (rank+nama+persen sejajar horizontal, kesannya
                  // "tabel") jadi TIMELINE vertikal: titik (dot) + garis
                  // penghubung di kolom kiri, nama+persentase di kanan.
                  // Custom Box+sx (bukan `@mui/lab` Timeline — belum
                  // terpasang di proyek ini, tidak perlu dependency baru
                  // buat pola visual sesederhana ini).
                  overviewTopCustomers.map((r, i) => {
                    const isLast = i === overviewTopCustomers.length - 1;
                    const pct = totalRevenueAll > 0 ? Math.round((r.total_revenue / totalRevenueAll) * 100) : 0;
                    const momCategoryCount = momCategoryCountByCustomer.get(r.customer_id);
                    // 'new' (belum ada di periode sebelumnya) diperlakukan
                    // sbg tren naik (↗) — customer baru muncul = sinyal
                    // pertumbuhan, cuma 3 status ikon yang diminta (↗↘→),
                    // tidak ada ikon ke-4 khusus "baru".
                    const trendDirection: 'up' | 'down' | 'flat' =
                      momCategoryCount == null || r.category_count > momCategoryCount ? 'up'
                        : r.category_count < momCategoryCount ? 'down' : 'flat';
                    const TrendIcon = trendDirection === 'up' ? TrendingUpIcon : trendDirection === 'down' ? TrendingDownIcon : TrendingFlatIcon;
                    const trendColor = trendDirection === 'up' ? theme.palette.success.main : trendDirection === 'down' ? theme.palette.error.main : theme.palette.text.disabled;
                    return (
                      <Box key={r.customer_id} sx={{ display: 'flex', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0, mt: 0.5 }} />
                          {!isLast && <Box sx={{ flex: 1, width: '2px', bgcolor: 'divider', my: 0.5 }} />}
                        </Box>
                        {/* Susulan (2026-08-22, koreksi user: "perkecil
                            ukuran font nama customer, pindahkan nomor ke
                            depan nama customer, seperti layout awal
                            hanya modelnya bukan tabel tapi timeline") —
                            konten kembali ke format awal (nomor+nama
                            satu baris, persentase di ujung kanan, font
                            lebih kecil `caption` bukan `body2`) — cuma
                            bungkusnya (dot+garis di kiri) yang tetap
                            timeline, bukan daftar baris polos lagi. */}
                        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1, pb: isLast ? 0.5 : 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                            {i + 1}. {r.customer_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
                            {pct}%
                          </Typography>
                          {/* Chip BULAT (2026-08-22, koreksi user:
                              "tambahkan chip bulat untuk icon nya bukan
                              kapsul") — bukan `StatusChip` (itu oval/
                              kapsul, atomic tapi bentuknya beda) — bulat
                              penuh via `borderRadius:'50%'` + background
                              tint warna tren. */}
                          <Box
                            sx={{
                              width: 22, height: 22, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              bgcolor: alpha(trendColor, 0.15), flexShrink: 0,
                            }}
                          >
                            <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            )}
            {!isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/report/growth?tab=cross_selling')}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  {t('crossSelling.viewDetailInReport')}
                </Button>
              </Box>
            )}
          </Grid>
          </Grid>
        </Box>
      </Card>

      {/* M1.1: Heatmap — Customer × Product Category. */}
      <Grid container spacing={2} sx={{ pt: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.heatmapKpiRevenueLabel')}
              value={formatRupiah(heatmapTotalRevenue)}
              sub={t('crossSelling.heatmapKpiRevenueSub', { pct: totalRevenueAll > 0 ? Math.round((heatmapTotalRevenue / totalRevenueAll) * 100) : 0 })}
              color={theme.palette.primary.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.heatmapKpiAvgCategoryLabel')}
              value={heatmapAvgCategories.toFixed(2)}
              sub={t('crossSelling.heatmapKpiAvgCategorySub', { count: heatmapRows.length })}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.heatmapKpiTopCategoryLabel')}
              value={heatmapTopCategory?.label ?? '—'}
              sub={t('crossSelling.heatmapKpiTopCategorySub', { count: heatmapTopCategory?.count ?? 0, total: heatmapRows.length })}
              color={theme.palette.success.main}
            />
          )}
        </Grid>
      </Grid>

      <Box sx={{ pt: 1 }}>
          {/* Susulan (2026-08-22, instruksi user: "pindahkan ini sebagai
              judul card seperti diatas") — judul+helper text+chip yang
              dulu render TERPISAH di LUAR Card widget (SectionLabel+Box
              polos di atas `<HeatmapWidget>`) SEKARANG dipindah jadi
              `headerContent` widget, dirender DI DALAM Card widget itu
              sendiri — pola SAMA PERSIS `ComboChartWidget`'s
              `headerContent` (§30.24, "pindahkan text ini ke container
              chart bukan diluarnya"). Tanggal via formatDateID (util,
              DD-MM-YYYY). "Top 8 kategori" yang dulu ada di helper text
              DIHAPUS — tidak pernah akurat (jumlah kategori dinamis per
              company, 4-6+, tidak ada cap "8" sama sekali di backend),
              chip di bawah ini SUDAH tampilkan jumlah kategori yang benar. */}
          {isLoading ? (
            <Skeleton variant="rectangular" height={420} />
          ) : (
            <HeatmapWidget
              headerContent={
                <>
                  {/* Tooltip info (2026-08-22, instruksi user: "tambahkan
                      tooltip di sebelah judul seperti cross sell") — pola
                      SAMA PERSIS info icon di judul chart utama
                      (MuiTooltip+IconButton+InfoOutlinedIcon,
                      whiteSpace:'pre-line' krn teksnya multi-baris). */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SectionLabel label={t('crossSelling.labelM11')} icon={GridOnIcon} />
                    <MuiTooltip
                      title={t('crossSelling.heatmapTooltip')}
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  {/* Susulan (2026-08-22, instruksi user: "untuk teks ini
                      [Klik sel untuk melihat detail produk] letakkan di
                      sebelah kanan, tambahkan chip supaya lebih membuat
                      orang ter-notice") — dari teks caption polos baris
                      sendiri, PINDAH ke kanan (justifyContent:
                      'space-between', 1 baris sama dgn chip kategori),
                      DAN dibungkus `StatusChip` (atomic, warna `info` —
                      beda dari Chip abu-abu "6 kategori" di sebelahnya,
                      biar kontras & kelihatan lebih menonjol/
                      "notice-able" sesuai instruksi). */}
                  {/* Susulan (2026-08-22, instruksi user: "text 6 kategori
                      samakan ukuran teks sesuai dengan klik sel...") —
                      Chip MUI polos (`size="small"` default font ~0.81rem)
                      diganti `StatusChip` (atomic, sama persis dipakai
                      chip CTA di sampingnya, font 0.68rem) — biar 2 chip
                      ini SAMA besar tulisannya, `color="default"` (abu2,
                      beda dari CTA yang "info"/cyan) biar tetap kebeda
                      secara peran (info netral vs ajakan aksi). */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                    {data?.categories && data.categories.length > 0 && (
                      <StatusChip label={t('crossSelling.categoriesCountChip', { count: data.categories.length })} color="default" />
                    )}
                    <StatusChip icon={<TouchAppIcon />} label={t('crossSelling.heatmapSubtitle2')} color="info" />
                  </Box>

                  {/* Susulan (2026-08-22, instruksi user: "apakah lebih baik
                      diletakkan di bawah" -> "pindahkan saja", lalu
                      "letakkan di tengah") — kalimat deskripsi ("30
                      customer teratas...") DIPISAH jadi baris sendiri di
                      bawah baris chip (biar baris chip tidak sesak), lalu
                      di-center (`textAlign:'center'`), bukan rata kiri
                      lagi. */}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textAlign: 'center' }}>
                    {t('crossSelling.heatmapHelperText', {
                      start: data?.period.start ? formatDateID(data.period.start) : '…',
                      end: data?.period.end ? formatDateID(data.period.end) : '…',
                    })}
                  </Typography>
                </>
              }
              xLabels={(data?.categories ?? []).map(relabelCategory(t))}
              data={(data?.heatmap ?? []).map((row) => {
                const relabel = relabelCategory(t);
                return {
                  customer: row.customer,
                  customerId: row.customer_id,
                  values:   Object.fromEntries(Object.entries(row.values).map(([k, v]) => [relabel(k), v])),
                  revenues: Object.fromEntries(Object.entries(row.revenues).map(([k, v]) => [relabel(k), v])),
                  totalRevenue: row.total_revenue,
                };
              })}
              onCellClick={(row, label) => {
                const rawKey = (data?.categories ?? []).find((c) => relabelCategory(t)(c) === label);
                if (!rawKey || row.customerId === undefined) return;
                setProductDrill({ customerId: row.customerId, customerName: row.customer, itemType: rawKey, itemLabel: label });
              }}
            />
          )}
      </Box>

      {/* M1.1 Drill-down Dialog — detail produk per customer × kategori yang diklik di heatmap */}
      <Dialog
        open={!!productDrill}
        onClose={() => setProductDrill(null)}
        maxWidth="md"
        title={`${productDrill?.customerName ?? '—'} · ${productDrill?.itemLabel ?? ''}`}
        showCloseButton
        contentSx={{ p: 1 }}
        // Susulan (2026-08-22, koreksi user: "tidak sesuai dengan filter,
        // bulanan, kuartalan, semesteran, tahunan; informasi juga kurang
        // lengkap, total produk, total invoice, total revenue, total GP")
        // — subtitle DULU "Window {{window}} bulan terakhir" (angka
        // activeWindow, config existing-customer, tidak terkait filter
        // granularitas halaman) — SEKARANG: (1) rentang tanggal SEBENARNYA
        // yang dipakai query (period_start/end, sama persis dgn heatmap),
        // (2) 4 baris ringkasan (Total Produk/Invoice/Revenue/GP) dari
        // `productSummary` (`meta.summary`, agregat backend), pola sama
        // persis dialog drill-down M2 (`m2DialogAvgCategories` dkk).
        subtitle={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('crossSelling.m11DialogSubtitle', {
                start: data?.period.start ? formatDateID(data.period.start) : '…',
                end: data?.period.end ? formatDateID(data.period.end) : '…',
              })}
            </Typography>
            {productSummary && ([
              [t('crossSelling.m11SummaryProducts'), String(productSummary.product_count ?? 0)],
              [t('crossSelling.m11SummaryInvoices'), String(productSummary.invoice_count ?? 0)],
              [t('crossSelling.m11SummaryRevenue'), formatRupiah(productSummary.total_revenue ?? 0)],
              [t('crossSelling.m11SummaryGp'), formatRupiah(productSummary.total_gp ?? 0)],
            ] as [string, string][]).map(([label, val]) => (
              <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
              </Box>
            ))}
          </Box>
        }
      >
        <ResponsiveListView
          rows={(productData?.data ?? []).map((r) => ({ ...r, id: r.product_id }))}
          columns={productColumns}
          loading={productLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('crossSelling.m11EmptyMessage')}
          mobileFields={['product_name', 'total_revenue', 'gp_margin_percent']}
        />
      </Dialog>
    </Box>
  );
}
