import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { useDormantCustomer } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { KpiSummaryStrip } from '@/components/analisis/KpiSummaryStrip';
import { KpiSectionLabel } from '@/components/analisis/KpiSectionLabel';
import { Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears, shiftEndDate,
  type KpiPeriodType,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import type { GridColDef } from '@mui/x-data-grid';
import type { DormantValueRankingRow } from '@/types/metrics';

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

/** Persentase perubahan current vs comparison — null kalau comparison 0 (hindari bagi nol / "Infinity%"). */
function computeChangePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
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

  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const [periodType, setPeriodType] = useState<KpiPeriodType>('quarter');
  const [endDate, setEndDate] = useState<string>(todayIsoDate());
  const todayStr = todayIsoDate();
  const isViewingInProgress = endDate === todayStr;

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

  const totalCurrent = data?.value_ranking_total_current ?? 0;
  const totalComparison = data?.value_ranking_total_comparison ?? 0;
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
      valueFormatter: (v: string) => new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
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

      {/* ── M9: Horizontal Bar Ranking ── */}
      <Box>
        <KpiSectionLabel
          label={t('dormantValue.m9SectionLabel')}
          formula={{
            title: t('dormantValue.m9FormulaTitle'),
            formula: t('dormantValue.m9Formula'),
            note: t('dormantValue.m9FormulaNote'),
          }}
        />
        {isLoading ? (
          <Skeleton variant="rectangular" height={340} />
        ) : (
          <BarChartWidget
            title={t('dormantValue.m9ChartTitle')}
            subtitle={t('dormantValue.m9ChartSubtitle')}
            data={data?.value_ranking ?? []}
            series={[
              {
                key: 'estimated_lost_value',
                label: t('dormantValue.m9SeriesLabel'),
                color: theme.palette.error.main,
              },
            ]}
            xKey="customer_name"
            height={520}
            layout="horizontal"
            yAxisWidth={200}
            showLabels
            mobileNameInBar
            labelFormatter={(v) => fmtRp(v)}
            yAxisFormatter={(v) => fmtRp(v)}
            tooltipFormatter={(v, n) => [fmtRp(v), n]}
          />
        )}
      </Box>

      {/* ── Banner (KpiSummaryStrip) — total top-20 lost value, current vs
          setahun lalu; di bawah chart, sama urutan dgn Revenue ── */}
      {data && (
        <KpiSummaryStrip
          metrics={[
            { label: lostValueLabel, comparisonText: fmtRp(totalComparison), currentText: fmtRp(totalCurrent) },
          ]}
          comparisonRangeLabel={comparisonRangeText}
          currentRangeLabel={currentRangeText}
          isCurrentInProgress={isViewingInProgress}
          growth={[
            {
              metricLabel: lostValueLabel,
              pct: growthPct,
              value: totalCurrent - totalComparison,
              currentIsZero: totalCurrent === 0,
              // Dormant Value = inverse polarity (naik = buruk, lihat metricPolarity.ts)
              inversePolarity: true,
              formatValue: fmtRp,
            },
          ]}
          onPrev={() => setEndDate(shiftEndDate(periodType, endDate, -1))}
          onNext={() => {
            const next = shiftEndDate(periodType, endDate, 1);
            setEndDate(next > todayStr ? todayStr : next);
          }}
          nextDisabled={isViewingInProgress}
        />
      )}

      {/* ── Tabel M9 — snapshot type (ux-menu-mapping.md §7 "Adaptasi snapshot
          KPI 5/6/9") — TANPA kolom pembanding/Selisih/Status per-baris,
          karena `value_ranking` memang cuma snapshot top-20 saat ini, bukan
          pasangan periode current-vs-comparison seperti tabel Analisis
          Revenue (beda dari TOTAL-nya di banner atas yang sudah punya YoY). ── */}
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
  );
}
