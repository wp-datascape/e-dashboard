import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { LineChartWidget } from '@/components/charts/LineChartWidget';
import { useDormantCustomer } from '@/hooks/useMetrics';
import { useGlobalFilter } from '@/context/globalFilter.context';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner';
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard';
import { KpiSectionLabel } from '@/components/analisis/KpiSectionLabel';
import { Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod';
import { todayIsoDate, formatDateDDMMYYYY } from '@/utils/date';
import { computeChangePct, averageMonthsInRange } from '@/utils/analisisComparison';
import type { GridColDef } from '@mui/x-data-grid';
import type { DormantValueRankingRow } from '@/types/metrics';

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

// KPI 9 — Dormant Customer Value. Sebelumnya bagian dari bundel
// DormantCustomer (M8+M9+M10 1 route) — dipecah jadi halaman sendiri
// mengikuti keputusan ux-menu-mapping.md v9 "1 route = 1 KPI" (task025 §7a).
// Filter+banner dimigrasi ke KpiFilterBar+KpiSummaryStrip (task025 lanjutan
// 2026-08-07) — GLOBAL apple-to-apple dgn halaman Revenue. Banner pakai
// TOTAL estimated_lost_value dari top-20 ranking, current vs setahun lalu
// (top-20 dihitung ULANG di tanggal pembanding oleh backend — bukan
// snapshot ranking yang sama, lihat metrics.service.ts). Tabel TETAP
// snapshot (tanpa kolom Selisih/Status) — value_ranking sendiri masih
// LIMIT 20 tanpa pasangan periode per-baris, sesuai adaptasi §7 utk KPI 9.
// Endpoint backend TETAP 1 (`GET /metrics/dormant-customer`, gabungan M8-M10).
export default function DormantValue() {
  const theme = useTheme();
  const { t } = useTranslation();

  const scopeFilter = useGlobalFilter();
  const {
    companyId, branchId, division, excludeIntercompany,
    periodType, setPeriodType, endDate, setEndDate,
  } = scopeFilter;
  const todayStr = todayIsoDate();

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate));
  const periodStart = getPeriodDateRange(periodType, periodKey).start;
  const currentRangeText = formatDateRange({ start: periodStart, end: endDate });
  const comparisonRangeText = formatDateRange({
    start: shiftDateByYears(periodStart, -1),
    end: shiftDateByYears(endDate, -1),
  });

  const { data, isLoading } = useDormantCustomer({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: endDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });
  // Fetch kedua di tanggal pembanding (setahun lalu) — sama pola dgn
  // DormantRate/ReactivationRate (task025 §18/§19): butuh `value_trend`
  // SENDIRI yang berakhir di comparisonDate, supaya averageMonthsInRange
  // bisa dihitung independen utk sisi pembanding juga.
  const comparisonDate = shiftDateByYears(endDate, -1);
  const { data: comparisonData } = useDormantCustomer({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: comparisonDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  // Rata-rata bulan yg genuinely masuk rentang periodStart..endDate dari
  // `value_trend` (SELURUH customer dormant, bukan cuma top-20 seperti
  // `value_ranking_total_*` lama) — BUKAN trailing-N-by-posisi-array lagi
  // (bug §8g/KPI4, ditemukan lagi 2026-08-10 via laporan user "reactivation
  // rate di dashboard dan di KPI tidak sama"), konsisten dgn KPI8/KPI10 &
  // Dashboard Overview. Parameter kalkulasi TIDAK berubah — formula/
  // threshold dormant sama persis dgn sebelumnya.
  const totalCurrent = averageMonthsInRange(data?.value_trend ?? [], periodStart, endDate, (p) => p.value);
  const totalComparison = averageMonthsInRange(comparisonData?.value_trend ?? [], shiftDateByYears(periodStart, -1), comparisonDate, (p) => p.value);
  const growthPct = data ? computeChangePct(totalCurrent, totalComparison) : null;
  const lostValueLabel = t('dormantValue.m9SeriesLabel');

  // Tabel ranking — filter client-side, `value_ranking` cuma snapshot top-20
  // dari backend (LIMIT 20 di query), bukan dataset besar yang butuh
  // search/pagination server-side.
  const [search, setSearch] = useState('');
  const valueRanking = data?.value_ranking ?? [];
  const filteredValueRanking = search
    ? valueRanking.filter((row) =>
        row.customer_name.toLowerCase().includes(search.toLowerCase())
        || (row.customer_code ?? '').toLowerCase().includes(search.toLowerCase()))
    : valueRanking;

  const columns: GridColDef<DormantValueRankingRow>[] = [
    {
      // Kolom Perusahaan — template §7 ux-menu-mapping.md WAJIB kolom ini
      // sebagai kolom pertama di semua tabel KPI (sebelumnya tidak ada di
      // sini, ditambah menyusul task025 lanjutan 2026-08-07).
      field: 'company_name',
      headerName: t('dormantValue.colCompany'),
      minWidth: 150,
      flex: 0.7,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" noWrap title={row.company_name}>
          {row.company_name || '-'}
        </Typography>
      ),
    },
    {
      field: 'customer_name',
      headerName: t('dormantValue.colCustomer'),
      flex: 1.4,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{row.customer_name}</Typography>
          {row.customer_code && (
            <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'last_invoice_date',
      headerName: t('dormantValue.colLastTransaction'),
      minWidth: 160,
      flex: 0.9,
      valueFormatter: (v: string) => formatDateDDMMYYYY(v),
    },
    {
      field: 'months_dormant',
      headerName: t('dormantValue.colMonthsDormant'),
      minWidth: 170,
      flex: 0.8,
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: row.months_dormant >= 6 ? 700 : 400, color: row.months_dormant >= 6 ? 'error.main' : undefined }}>
          {row.months_dormant}
        </Typography>
      ),
    },
    {
      field: 'avg_monthly_revenue',
      headerName: t('dormantValue.colAvgMonthlyRevenue'),
      minWidth: 170,
      flex: 0.9,
      valueFormatter: (v: number) => fmtRp(v),
    },
    {
      field: 'estimated_lost_value',
      headerName: t('dormantValue.colEstimatedLostValue'),
      minWidth: 190,
      flex: 1,
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
          {fmtRp(row.estimated_lost_value)}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">{t('dormantValue.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('dormantValue.pageSubtitle')}</Typography>
      </Box>

      {/* ── Filter bar (template §1 ux-menu-mapping.md — GLOBAL apple-to-apple
          dgn Revenue, task025 lanjutan 2026-08-07) ── */}
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
        }}
      />

      {/* ── Banner "Detail Periode & Pembanding YoY" — standar 10 halaman
          KPI (2026-08-10), menggantikan KpiSummaryStrip. Total lost value
          (SELURUH dormant, bukan cuma top-20), current vs setahun lalu.
          Dormant Value = inverse polarity (naik = buruk). ── */}
      <PeriodYoyBanner
        currentRangeText={currentRangeText}
        comparisonRangeText={comparisonRangeText}
        metrics={[{
          label: lostValueLabel,
          baselineValueText: fmtRp(totalComparison),
          deltaValueText: fmtRp(Math.abs(totalCurrent - totalComparison)),
          growthPct,
          inversePolarity: true,
        }]}
      />

      {/* ── 2 kartu — Estimasi Nilai Hilang & Jumlah Customer Dormant ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <KpiMetricCard
            label={lostValueLabel}
            accentColor={theme.palette.error.main}
            value={fmtRp(totalCurrent)}
            growthPct={growthPct}
            deltaValueText={fmtRp(Math.abs(totalCurrent - totalComparison))}
            comparisonValueText={fmtRp(totalComparison)}
            inversePolarity
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <KpiMetricCard
            label={t('dormantRate.dormantCountLabel')}
            accentColor={theme.custom.data[1]}
            value={String(data?.dormant_rate_current.dormant_count ?? 0)}
            caption={`${t('dormantRate.totalCustomerLabel')}: ${data?.dormant_rate_current.total_customers ?? 0}`}
          />
        </Grid>
      </Grid>

      {/* ── M9: 2 chart berdampingan (grid-cols-2 50/50, pola referensi
          executive-kpi-dashboard KPI9View) — kiri: ranking horizontal top-5
          (dipangkas dari full top-20 supaya proporsional di kolom 50%,
          daftar lengkap tetap ada di tabel di bawah), kanan: tren 12 bulan
          total estimasi nilai hilang (`value_trend` — SUDAH ada di data,
          BARU dipakai sbg chart di sini, sebelumnya cuma dipakai utk
          hitung banner/kartu). ── */}
      <Box>
        <KpiSectionLabel
          label={t('dormantValue.m9SectionLabel')}
          formula={{
            title: t('dormantValue.m9FormulaTitle'),
            formula: t('dormantValue.m9Formula'),
            note: t('dormantValue.m9FormulaNote'),
          }}
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <BarChartWidget
                title={t('dormantValue.m9ChartTitle')}
                subtitle={t('dormantValue.m9ChartSubtitle')}
                data={(data?.value_ranking ?? []).slice(0, 5)}
                series={[
                  {
                    key: 'estimated_lost_value',
                    label: t('dormantValue.m9SeriesLabel'),
                    color: theme.palette.error.main,
                  },
                ]}
                xKey="customer_name"
                height={280}
                layout="horizontal"
                yAxisWidth={140}
                showLabels
                mobileNameInBar
                labelFormatter={(v) => fmtRp(v)}
                yAxisFormatter={(v) => fmtRp(v)}
                tooltipFormatter={(v, n) => [fmtRp(v), n]}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={280} />
            ) : (
              <LineChartWidget
                title={t('dormantValue.trendChartTitle')}
                subtitle={t('dormantValue.trendChartSubtitle')}
                data={data?.value_trend ?? []}
                series={[
                  { key: 'value', label: lostValueLabel, color: theme.palette.error.main, formatValue: (v) => fmtRp(v) },
                ]}
                xKey="month"
                height={280}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── Tabel ranking lengkap top-20 — daftar penuh tetap di sini,
          chart di atas cuma preview top-5. ── */}
      <Box>
        <KpiSectionLabel label={t('dormantValue.rankingTableSectionLabel')} />
        {/* Snapshot type (ux-menu-mapping.md §7 "Adaptasi snapshot KPI 5/6/9")
            — TANPA kolom pembanding/Selisih/Status per-baris, karena
            `value_ranking` memang cuma snapshot top-20 saat ini, bukan
            pasangan periode current-vs-comparison seperti tabel Analisis
            Revenue (beda dari TOTAL-nya di banner atas yang sudah punya YoY). */}
        {!isLoading && (
          <Card>
            <KpiTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('dormantValue.searchPlaceholder')}
              totalCountText={t('dormantValue.customerCountText', { count: filteredValueRanking.length })}
            />
            <ResponsiveListView
              rows={filteredValueRanking.map((row) => ({ ...row, id: row.customer_id }))}
              columns={columns}
              emptyMessage={t('dormantValue.emptyTable')}
              mobileFields={['customer_name', 'company_name', 'last_invoice_date', 'months_dormant', 'avg_monthly_revenue', 'estimated_lost_value']}
              height={420}
              pageSize={10}
              pageSizeOptions={[10, 20]}
            />
          </Card>
        )}
      </Box>
    </Box>
  );
}
