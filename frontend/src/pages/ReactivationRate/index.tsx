import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { BulletChartWidget } from '@/components/charts/BulletChartWidget';
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
import type { ReactivatedCustomerRow } from '@/types/metrics';

/** Persentase perubahan current vs comparison — null kalau comparison 0 (hindari bagi nol / "Infinity%"). */
function computeChangePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function fmtDate(v: string): string {
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// KPI 10 — Customer Reactivation Rate. Sebelumnya bagian dari bundel
// DormantCustomer (M8+M9+M10 1 route) — dipecah jadi halaman sendiri
// mengikuti keputusan ux-menu-mapping.md v9 "1 route = 1 KPI" (task025 §7a).
// Filter+banner dimigrasi ke KpiFilterBar+KpiSummaryStrip (task025 lanjutan
// 2026-08-07) — GLOBAL apple-to-apple dgn halaman Revenue, termasuk
// perbandingan YoY nyata (backend dihitung ulang di tanggal setahun lalu —
// lihat metrics.service.ts::getDormantCustomerMetrics).
// Endpoint backend TETAP 1 (`GET /metrics/dormant-customer`, gabungan M8-M10)
// — halaman ini cuma menampilkan slice M10-nya saja.
export default function ReactivationRate() {
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

  const rc = data?.reactivation_current;
  const targetLow = rc?.target_low ?? 15;
  const targetHigh = rc?.target_high ?? 20;
  const bulletMax = Math.max(targetHigh * 2, 30);

  const growthPct = rc ? computeChangePct(rc.value, rc.comparison_value) : null;
  const reactivationLabel = t('reactivationRate.m10ChartTitle');

  // ── Tabel — daftar pelanggan yang kembali aktif (KPI10). Snapshot top-20
  // (query baru `fetchReactivatedCustomers`, konsisten dgn window bulan
  // berjalan yang sama dgn reactivation_current) — filter client-side sama
  // pola dgn tabel KPI9, bukan server-side (bukan dataset besar).
  const [search, setSearch] = useState('');
  const reactivatedList = data?.reactivated_customers ?? [];
  const filteredReactivated = search
    ? reactivatedList.filter((row) =>
        row.customer_name.toLowerCase().includes(search.toLowerCase())
        || (row.customer_code ?? '').toLowerCase().includes(search.toLowerCase()))
    : reactivatedList;

  const tableColumns: GridColDef<ReactivatedCustomerRow>[] = [
    {
      field: 'company_name',
      headerName: t('reactivationRate.colCompany'),
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
      headerName: t('reactivationRate.colCustomer'),
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
      field: 'previous_last_invoice_date',
      headerName: t('reactivationRate.colPreviousLastInvoice'),
      minWidth: 170,
      flex: 0.9,
      valueFormatter: (v: string) => fmtDate(v),
    },
    {
      field: 'reactivation_date',
      headerName: t('reactivationRate.colReactivationDate'),
      minWidth: 170,
      flex: 0.9,
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
          {fmtDate(row.reactivation_date)}
        </Typography>
      ),
    },
    {
      field: 'months_was_dormant',
      headerName: t('reactivationRate.colMonthsWasDormant'),
      minWidth: 170,
      flex: 0.8,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">{t('reactivationRate.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('reactivationRate.pageSubtitle')}</Typography>
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
        }}
      />

      {/* ── M10: Bullet Chart + Trend ── */}
      <Box>
        <KpiSectionLabel label={t('reactivationRate.m10SectionLabel')} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <BulletChartWidget
                title={t('reactivationRate.m10ChartTitle')}
                subtitle={t('reactivationRate.m10ChartSubtitle', { targetLow, targetHigh })}
                value={rc?.value ?? 0}
                targetLow={targetLow}
                targetHigh={targetHigh}
                max={bulletMax}
                unit="%"
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {isLoading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : (
              <LineAlertWidget
                title={t('reactivationRate.m10TrendTitle')}
                subtitle={t('reactivationRate.m10TrendSubtitle', { targetLow, targetHigh })}
                data={data?.trend ?? []}
                lineKey="reactivation_rate"
                lineLabel={t('reactivationRate.lineLabelReactivationRate')}
                xKey="month"
                threshold={targetLow}
                thresholdLabel={t('reactivationRate.targetMinLabel', { targetLow })}
                height={180}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── Banner (KpiSummaryStrip) — di bawah chart, sama urutan dgn Revenue ── */}
      {rc && (
        <KpiSummaryStrip
          metrics={[
            { label: reactivationLabel, comparisonText: `${rc.comparison_value}%`, currentText: `${rc.value}%` },
          ]}
          comparisonRangeLabel={comparisonRangeText}
          currentRangeLabel={currentRangeText}
          isCurrentInProgress={isViewingInProgress}
          growth={[
            {
              metricLabel: reactivationLabel,
              pct: growthPct,
              value: rc.value - rc.comparison_value,
              currentIsZero: rc.value === 0,
              // Reactivation Rate = polaritas normal (naik = baik)
              formatValue: (v) => `${v.toFixed(1)}%`,
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

      {/* ── Tabel — daftar pelanggan yang kembali aktif (KPI10) ── */}
      <Box>
        <KpiSectionLabel label={t('reactivationRate.tableSectionLabel')} />
        <Card>
          <KpiTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('reactivationRate.searchPlaceholder')}
            totalCountText={t('reactivationRate.customerCountText', { count: filteredReactivated.length })}
          />
          <ResponsiveListView
            rows={filteredReactivated.map((row) => ({ ...row, id: row.customer_id }))}
            columns={tableColumns}
            emptyMessage={t('reactivationRate.emptyTable')}
            mobileFields={['customer_name', 'company_name', 'previous_last_invoice_date', 'reactivation_date', 'months_was_dormant']}
            height={420}
            pageSize={10}
            pageSizeOptions={[10, 20]}
          />
        </Card>
      </Box>
    </Box>
  );
}
