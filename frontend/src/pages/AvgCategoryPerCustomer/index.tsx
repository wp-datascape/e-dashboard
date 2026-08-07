import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card } from '@/components/ui';
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar';
import { useCrossSelling } from '@/hooks/useMetrics';
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { DateScopeFilterBar } from '@/components/filters/DateScopeFilterBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtRp(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        mb: 0.5,
        color: 'text.secondary',
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Typography>
  );
}

// ─── KPI Summary Card ─────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  color = 'primary.main',
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  return (
    <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{sub}</Typography>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// KPI 2 — Rata-rata jumlah kategori produk yang dibeli per customer (M2).
// Dibelah dari `pages/CrossSelling` (task025 §14, 2026-08-07) — user:
// "halaman yang kamu kerjakan juga 1 page untuk 2 KPI yang harus dipisahkan
// itu menyalahi aturan". Endpoint backend TETAP 1 (`/metrics/cross-selling`
// via `useCrossSelling`, sama presedennya dgn Dormant §7a) — dipanggil
// terpisah di sini (bukan share state dgn halaman KPI1), permission juga
// TETAP `cross.selling:*` (reuse, sama alasan). Menggantikan `ProductsTrend`
// (`/products/trend`) yang REDUNDAN — endpoint lamanya (`/metrics/
// avg-category`) cuma agregat tanpa detail per customer, halaman ini jauh
// lebih lengkap (tabel persisten dari `data.detail`).
export default function AvgCategoryPerCustomer() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [periodEnd,  setPeriodEnd]  = useState(todayStr());
  const scopeFilter = useScopedCompanyFilter();
  const { companyId, branchId, division, excludeIntercompany } = scopeFilter;

  const { data, isLoading } = useCrossSelling({
    company_id: companyId,
    branch_id:   branchId === 'all' ? undefined : branchId,
    period_end:  periodEnd,
    division:    division || undefined,
    exclude_intercompany: excludeIntercompany,
  });

  const latestTrend = data?.trend.at(-1);

  const [search, setSearch] = useState('');
  const rows = data?.detail ?? [];
  const filteredRows = search
    ? rows.filter((r) =>
        r.customer_name.toLowerCase().includes(search.toLowerCase())
        || (r.customer_code ?? '').toLowerCase().includes(search.toLowerCase()))
    : rows;

  // minWidth+flex (bukan width tetap) — anti-truncation, konsisten dgn pola
  // yang sudah dipakai di semua tabel KPI lain sejak task025.
  const columns: GridColDef[] = [
    { field: 'customer_code', headerName: t('crossSelling.colCustomerCode'), minWidth: 140, flex: 0.8 },
    { field: 'customer_name', headerName: t('crossSelling.colCustomerName'), flex: 1.4, minWidth: 200 },
    {
      field: 'has_unit',
      headerName: t('crossSelling.chipUnit'),
      minWidth: 110,
      flex: 0.6,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_consumable',
      headerName: t('crossSelling.chipConsumable'),
      minWidth: 140,
      flex: 0.7,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'has_sparepart',
      headerName: t('crossSelling.chipSparepart'),
      minWidth: 140,
      flex: 0.7,
      renderCell: (p) => (
        <StatusChip label={p.value ? t('crossSelling.yes') : t('crossSelling.no')} color={p.value ? 'primary' : 'default'} />
      ),
    },
    {
      field: 'category_count',
      headerName: t('crossSelling.colCategoryCount'),
      minWidth: 150,
      flex: 0.8,
      type: 'number',
    },
    {
      field: 'total_revenue',
      headerName: t('crossSelling.colTotalRevenue'),
      minWidth: 160,
      flex: 0.9,
      type: 'number',
      valueFormatter: (value: number) => fmtRp(value),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ── */}
      <Box>
        <Typography variant="pageTitle">
          {t('avgCategoryPerCustomer.pageTitle')}
        </Typography>
        <Typography variant="pageSubtitle" sx={{ mt: 0.5 }}>
          {t('avgCategoryPerCustomer.pageSubtitle', { months: data?.period.active_months ?? '…' })}
        </Typography>
      </Box>

      {/* ── Filter bar (template §1 ux-menu-mapping.md — GLOBAL apple-to-apple
          dgn semua halaman KPI lain) ── */}
      <DateScopeFilterBar
        scopeFilter={scopeFilter}
        periodEnd={periodEnd}
        onPeriodEndChange={setPeriodEnd}
        onReset={() => {
          scopeFilter.reset();
          setPeriodEnd(todayStr());
        }}
      />

      {/* ── KPI Summary Card ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('crossSelling.kpi2Label')}
              value={data?.kpi2.avg_categories ?? 0}
              sub={t('crossSelling.kpi2Sub', { distinct: data?.kpi2.total_distinct_cats ?? 0, months: data?.period.active_months ?? '…' })}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
      </Grid>

      {/* ── M2: Avg Category per Customer Trend ── */}
      <Box>
        <SectionLabel label={t('crossSelling.labelM2')} />
        {isLoading ? (
          <Skeleton variant="rectangular" height={260} />
        ) : (
          <AreaChartWidget
            title={t('crossSelling.m2ChartTitle')}
            subtitle={`${t('crossSelling.m2ChartSubtitle', { months: data?.period.active_months ?? '…' })}`}
            value={`${latestTrend?.avg_category ?? 0}`}
            data={data?.trend ?? []}
            series={[{ key: 'avg_category', label: t('dashboard.charts.avgCategoryLabel'), color: theme.palette.success.main }]}
            xKey="month"
            height={220}
          />
        )}
      </Box>

      {/* ── Tabel persisten — bound ke `periodEnd` filter ── */}
      <Card>
        <KpiTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('crossSelling.m2SearchPlaceholder')}
          totalCountText={t('crossSelling.m2CustomerCountText', { count: filteredRows.length })}
        />
        <ResponsiveListView
          rows={filteredRows.map((r) => ({ ...r, id: r.customer_id }))}
          columns={columns}
          loading={isLoading}
          emptyMessage={t('crossSelling.m2EmptyMessage')}
          mobileFields={['customer_name', 'category_count', 'total_revenue']}
          height={420}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
        />
      </Card>
    </Box>
  );
}
