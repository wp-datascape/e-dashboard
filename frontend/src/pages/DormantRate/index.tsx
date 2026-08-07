import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTranslation } from 'react-i18next';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { useDormantCustomer } from '@/hooks/useMetrics';
import { useCustomers } from '@/hooks/useCustomers';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { KpiFilterBar } from '@/components/filters/KpiFilterBar';
import { KpiSummaryStrip } from '@/components/analisis/KpiSummaryStrip';
import { KpiSectionLabel } from '@/components/analisis/KpiSectionLabel';
import { Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears, shiftEndDate,
  KPI_PERIOD_TYPE_MONTHS, type KpiPeriodType,
} from '@/utils/analisisPeriod';
import { todayIsoDate } from '@/utils/date';
import { computeChangePct, averageLastMonths } from '@/utils/analisisComparison';
import type { CustomerRow } from '@/types/customers';

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

/** Bulan dormant dihitung dari last_invoice_date vs tanggal acuan — mirror
 * formula backend `estimated_lost_value` (GREATEST(ROUND(diff/30), 1)),
 * cuma dihitung client-side krn endpoint /customers tidak expose field ini. */
function monthsDormant(lastInvoiceDate: string | null, asOfDate: string): number {
  if (!lastInvoiceDate) return 0;
  const diffDays = (new Date(asOfDate).getTime() - new Date(lastInvoiceDate).getTime()) / 86_400_000;
  return Math.max(Math.round(diffDays / 30), 1);
}

// KPI 8 — Dormant Customer Rate. Sebelumnya bagian dari bundel
// DormantCustomer (M8+M9+M10 1 route) — dipecah jadi halaman sendiri
// mengikuti keputusan ux-menu-mapping.md v9 "1 route = 1 KPI" (task025 §7a).
// Filter+banner dimigrasi ke KpiFilterBar+KpiSummaryStrip (task025 lanjutan
// 2026-08-07) — GLOBAL apple-to-apple dgn halaman Revenue, termasuk
// perbandingan YoY nyata (backend dihitung ulang di tanggal setahun lalu,
// bukan cuma UI kosong — lihat metrics.service.ts::getDormantCustomerMetrics).
// Endpoint backend TETAP 1 (`GET /metrics/dormant-customer`, gabungan M8-M10)
// — halaman ini cuma menampilkan slice M8-nya saja.
export default function DormantRate() {
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
  // Fetch kedua di tanggal pembanding (setahun lalu) — dibutuhkan supaya
  // rata-rata K-bulan (di bawah) punya trend 12-bulan SENDIRI yang berakhir
  // di comparisonDate, bukan cuma 1 scalar `comparison_value` (task025 §18,
  // sama pola dgn CrossSelling/AvgCategoryPerCustomer).
  const comparisonDate = shiftDateByYears(endDate, -1);
  const { data: comparisonData } = useDormantCustomer({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: comparisonDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const drc = data?.dormant_rate_current;
  const alertPct = drc?.alert_pct ?? 10;

  // Rata-rata K bulan terakhir (K = periodType), BUKAN cuma titik terakhir
  // — supaya dropdown Periode benar-benar mengubah angka (task025 §18).
  // Parameter kalkulasi TIDAK berubah — tiap titik trend tetap dihitung
  // backend dari business_configs + tanggal bulan itu, sama seperti
  // sebelumnya, ini murni agregasi tampilan.
  const periodMonths = KPI_PERIOD_TYPE_MONTHS[periodType];
  const currentDormantRate = averageLastMonths(data?.trend ?? [], periodMonths, (p) => p.dormant_rate);
  const comparisonDormantRate = averageLastMonths(comparisonData?.trend ?? [], periodMonths, (p) => p.dormant_rate);
  const growthPct = computeChangePct(currentDormantRate, comparisonDormantRate);
  const dormantRateLabel = t('dormantRate.dormantRateCurrentLabel');

  // ── Tabel — daftar pelanggan tidak aktif (KPI8). REUSE endpoint /customers
  // (status=dormant) yang sudah ada, BUKAN endpoint baru — sama pola dgn
  // "Keputusan A" (reuse tabel Analisis Revenue/Retention di KPI3/KPI6).
  // Konsekuensi: butuh permission `customer:view` juga (bukan cuma
  // `churn.risk:view`) — default role admin/user sudah membundel keduanya,
  // dicatat di task025.
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  const { data: customersData, isLoading: isTableLoading } = useCustomers({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    business_unit: division || undefined,
    status: 'dormant',
    as_of_date: endDate,
    search: search || undefined,
    exclude_intercompany: excludeIntercompany,
    sort_by: (sortModel[0]?.field as 'last_invoice_date' | 'avg_monthly_revenue' | undefined) ?? 'last_invoice_date',
    sort_dir: sortModel[0]?.sort ?? 'asc', // asc — paling lama dormant duluan
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
  });

  const tableColumns: GridColDef<CustomerRow>[] = [
    {
      field: 'company_name',
      headerName: t('dormantRate.colCompany'),
      minWidth: 150,
      flex: 0.7,
      sortable: false,
      valueGetter: (_v, row) => row.company.name,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" noWrap title={row.company.name}>
          {row.company.name || '-'}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: t('dormantRate.colCustomer'),
      flex: 1.4,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{row.name}</Typography>
          {row.customer_code && (
            <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'last_invoice_date',
      headerName: t('dormantRate.colLastTransaction'),
      minWidth: 160,
      flex: 0.9,
      sortingOrder: ['asc', 'desc', null],
      valueFormatter: (v: string | null) => v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    {
      field: '_months_dormant',
      headerName: t('dormantRate.colMonthsDormant'),
      minWidth: 170,
      flex: 0.8,
      sortable: false,
      valueGetter: (_v, row) => monthsDormant(row.last_invoice_date, endDate),
      renderCell: ({ row }) => {
        const months = monthsDormant(row.last_invoice_date, endDate);
        return (
          <Typography variant="body2" sx={{ fontWeight: months >= 6 ? 700 : 400, color: months >= 6 ? 'error.main' : undefined }}>
            {months}
          </Typography>
        );
      },
    },
    {
      field: 'avg_monthly_revenue',
      headerName: t('dormantRate.colAvgMonthlyRevenue'),
      minWidth: 170,
      flex: 0.9,
      sortingOrder: ['desc', 'asc', null],
      valueFormatter: (v: number) => fmtRp(v),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">{t('dormantRate.pageTitle')}</Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>{t('dormantRate.pageSubtitle')}</Typography>
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

      {/* ── M8: Line Chart + Red Alert Shading ── */}
      <Box>
        <KpiSectionLabel
          label={t('dormantRate.m8SectionLabel')}
          formula={{
            title: t('dormantRate.m8FormulaTitle'),
            formula: t('dormantRate.m8Formula'),
            note: t('dormantRate.m8FormulaNote'),
          }}
        />
        {isLoading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : (
          <LineAlertWidget
            title={t('dormantRate.m8ChartTitle')}
            subtitle={t('dormantRate.m8ChartSubtitle', { alertPct })}
            data={data?.trend ?? []}
            lineKey="dormant_rate"
            lineLabel={t('dormantRate.lineLabelDormantRate')}
            xKey="month"
            threshold={alertPct}
            thresholdLabel={t('dormantRate.thresholdLabelPct', { alertPct })}
            height={240}
          />
        )}
        {drc && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {t('dormantRate.dormantCountLabel')}: {t('dormantRate.customerCountValue', { count: drc.dormant_count })}
            {' · '}
            {t('dormantRate.totalCustomerLabel')}: {t('dormantRate.customerCountValue', { count: drc.total_customers })}
          </Typography>
        )}
      </Box>

      {/* ── Banner (KpiSummaryStrip) — di bawah chart, sama urutan dgn Revenue ── */}
      {drc && (
        <KpiSummaryStrip
          metrics={[
            { label: dormantRateLabel, comparisonText: `${comparisonDormantRate.toFixed(2)}%`, currentText: `${currentDormantRate.toFixed(2)}%` },
          ]}
          comparisonRangeLabel={comparisonRangeText}
          currentRangeLabel={currentRangeText}
          isCurrentInProgress={isViewingInProgress}
          growth={[
            {
              metricLabel: dormantRateLabel,
              pct: growthPct,
              value: currentDormantRate - comparisonDormantRate,
              currentIsZero: currentDormantRate === 0,
              // Dormant Rate = inverse polarity (naik = buruk, lihat metricPolarity.ts)
              inversePolarity: true,
              formatValue: (v) => `${v.toFixed(2)}%`,
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

      {/* ── Tabel — daftar pelanggan tidak aktif (KPI8), reuse endpoint
          /customers status=dormant. Server-side pagination/sort/search
          (bukan snapshot top-20 seperti KPI9 — daftar ini bisa ratusan
          baris). ── */}
      <Box>
        <KpiSectionLabel label={t('dormantRate.tableSectionLabel')} />
        <Card>
          <KpiTableToolbar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            searchPlaceholder={t('dormantRate.searchPlaceholder')}
            totalCountText={t('dormantRate.customerCountText', { count: customersData?.meta.total ?? 0 })}
          />
          <ResponsiveListView
            rows={(customersData?.data ?? []).map((row) => ({ ...row, id: row.id }))}
            columns={tableColumns}
            loading={isTableLoading}
            emptyMessage={t('dormantRate.emptyTable')}
            mobileFields={['name', 'company_name', 'last_invoice_date', '_months_dormant', 'avg_monthly_revenue']}
            rowCount={customersData?.meta.total ?? 0}
            paginationMode="server"
            sortingMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              setSortModel(model);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      </Box>
    </Box>
  );
}
