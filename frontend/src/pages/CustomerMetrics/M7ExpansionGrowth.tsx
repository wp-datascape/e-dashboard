import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { StatusChip } from '@/components/ui/StatusChip';
import { Dialog, Card } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { TrendSummary } from '@/components/dashboard/TrendSummary';
import { AreaChartWidget } from '@/components/charts/AreaChartWidget';
import { useCustomerMetrics, useExpansionBreakdown } from '@/hooks/useMetrics';
import type { CustomerMetricsTrendPoint } from '@/types/metrics';
import { SectionLabel, SummaryCard } from './HelperComponents';
import { ExpansionChart } from './ExpansionChart';
import { statusChipColor, statusLabel, useExpansionColumns } from './expansionHelpers';
import { formatRupiah } from '@/utils/format';
import {
  shiftDateByYears, formatPeriodLabel, formatPeriodLabelShort, getCurrentPeriodKey, getYoyPeriodKey, getPeriodDateRange,
} from '@/utils/analisisPeriod';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';

// M7 versi tab Growth (2026-08-21, permintaan user "sekarang tab ekspansi,
// perbaiki layouting" — lanjutan rollout "M1 jadi standar layout semua
// KPI"). Komponen TERPISAH dari M7Expansion.tsx (BUKAN diganti tempatnya)
// — M7Expansion.tsx tetap dipakai apa adanya di halaman Customer Metrics
// workbench (M3-M7 ditumpuk 1 halaman tanpa KpiHeader/tab, biar konsisten
// sesama M3-M6 di sana). Versi ini KHUSUS tab Ekspansi halaman Growth (mode
// fokus 1 KPI, sama seperti M1CrossSelling.tsx/M2AvgCategory.tsx) — reuse
// ExpansionChart (chart) + useExpansionColumns/statusChipColor/statusLabel
// (dialog drill-down) dari M7Expansion.tsx, TIDAK duplikasi logic itu.
// `trend`/`isLoading` reuse fetch yang sama dgn CustomerMetrics workbench
// (1x fetch per halaman Growth, dioper dari Growth/index.tsx) — KpiHeader
// YoY-nya SAJA yang fetch terpisah sendiri (pola sama M2AvgCategory.tsx).
interface Props {
  trend: CustomerMetricsTrendPoint[];
  isLoading: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  periodEnd: string;
  /** Granularitas trend (task029.md §30.9, 2026-08-22) — default 'monthly'
   * biar backward-compatible utk caller yang belum kirim (tidak ada saat
   * ini, tapi jaga-jaga). */
  periodType?: PeriodGranularity;
  excludeIntercompany?: boolean;
}

export function M7ExpansionGrowth({ trend, isLoading, companyId, branchId, division, periodEnd, periodType = 'monthly', excludeIntercompany }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const expansionColumns = useExpansionColumns(t);

  const current = trend[trend.length - 1];

  // Net expansion (2026-08-21, koreksi user: "bukankah datanya positif
  // negatif" — mini chart Overview sebelumnya cuma tampil up_rate, yang
  // SELALU positif, jadi teknik "fill by value" recharts tidak relevan.
  // `net = up_rate - down_rate - inactive_rate` GENUINELY bisa positif
  // ATAU negatif — metrik ringkas yang pas dipakai sbg 1 garis chart
  // simpel + fill-by-value (biru di atas 0, redup di bawah 0). Susulan
  // sama hari: inactive_rate ikut dikurangi juga (bukan cuma down_rate) —
  // customer yang berhenti order total itu momentum negatif juga, bukan
  // cuma yang masih order tapi mengecil.
  const trendWithNet = useMemo(
    () => trend.map((t) => ({ ...t, net: t.up_rate - t.down_rate - t.inactive_rate })),
    [trend],
  );

  const [py, pm, pd] = periodEnd.split('-').map(Number);
  const periodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd));
  const yoyPeriodKey = getYoyPeriodKey(periodType, periodKey);
  const yoyPeriodEnd = shiftDateByYears(periodEnd, -1);
  const currentPeriodLabel = formatPeriodLabel(periodType, periodKey);
  const yoyComparisonLabel = formatPeriodLabel(periodType, yoyPeriodKey);

  // Header Current/YoY — fetch terpisah, endpoint sama cuma period_end
  // digeser -1 tahun (pola sama persis M2AvgCategory.tsx).
  const { data: yoyData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId,
    period_end: yoyPeriodEnd,
    period_type: periodType,
    division,
    exclude_intercompany: excludeIntercompany,
  });
  const yoyCurrent = yoyData?.trend[yoyData.trend.length - 1];

  const [tab, setTab] = useState<'overview' | 'trend'>('overview');

  // ─── Drill-down (klik titik chart) ───────────────────────────────────────
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const { data: drillBreakdown, isLoading: drillLoading } = useExpansionBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });

  // Top Movers (tab Overview) — breakdown periode SAAT INI (bukan klik),
  // ambil 5 kenaikan revenue terbesar (data sudah terurut cur-prev DESC
  // dari backend, tinggal slice 5 teratas).
  const { data: currentBreakdown, isLoading: currentBreakdownLoading } = useExpansionBreakdown({
    period_end: periodEnd,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
  });
  const topMovers = useMemo(() => (currentBreakdown?.rows ?? []).slice(0, 5), [currentBreakdown]);

  // Table Filter (§28.7/§28.9, koreksi user "standarmu berubah-rubah, tab 3
  // ini melenceng jauh" — tabel breakdown M1/M2 (BreakdownTable.tsx) punya
  // Search+Sort di atas tabel, versi M7 sebelumnya tidak). Pola SAMA PERSIS
  // BreakdownTable.tsx — search nama/kode, sort client-side dari data yang
  // SUDAH ada (currentBreakdown, TIDAK ada fetch baru).
  const [tableSearch, setTableSearch] = useState('');
  const [tableSort, setTableSort] = useState<'name' | 'revenue_desc' | 'change_desc'>('name');
  const breakdownRows = useMemo(() => {
    const rows = currentBreakdown?.rows ?? [];
    const q = tableSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.customer_name.toLowerCase().includes(q) || (r.customer_code ?? '').toLowerCase().includes(q))
      : rows;
    const sorted = [...filtered];
    if (tableSort === 'revenue_desc') sorted.sort((a, b) => b.cur_revenue - a.cur_revenue);
    else if (tableSort === 'change_desc') sorted.sort((a, b) => (b.change_pct ?? -Infinity) - (a.change_pct ?? -Infinity));
    else sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    return sorted;
  }, [currentBreakdown, tableSearch, tableSort]);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionLabel label={t('metrics.expansion')} icon={TrendingUpIcon} />

        {isLoading ? (
          <Skeleton variant="rectangular" height={80} />
        ) : (
          <KpiHeader
            metricLabel={t('metrics.expansionShort')}
            current={current?.up_rate ?? 0}
            yoy={yoyCurrent?.up_rate ?? 0}
            kpiType="rate"
            currentPeriodLabel={currentPeriodLabel}
            comparisonLabel={yoyComparisonLabel}
          />
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { bgcolor: 'transparent', textTransform: 'none' },
            '& .MuiTab-root.Mui-selected': { bgcolor: 'transparent' },
          }}
        >
          <Tab value="overview" label={t('customerMetrics.m7.tabOverview')} sx={{ minHeight: 36, py: 0.5 }} />
          <Tab value="trend" label={t('customerMetrics.m7.tabTrendAnalysis')} sx={{ minHeight: 36, py: 0.5 }} />
        </Tabs>

        {tab === 'overview' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 300px' }}>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={168} />
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, height: '100%' }}>
                    {/* subValue = jumlah customer mentah (2026-08-22, user:
                        "Aku butuh data jumlah nya selain dari persentase") —
                        di bawah tiap persentase, reuse count yang sudah
                        dikirim backend (up_count/flat_count/down_count/
                        inactive_count), bukan hitung ulang dari rate*existing
                        yang cuma perkiraan (rate sudah dibulatkan 1 desimal). */}
                    <SummaryCard
                      label={t('customerMetrics.m7.summaryUpRate')}
                      value={`${(current?.up_rate ?? 0).toFixed(1)}%`}
                      subValue={t('customerMetrics.m7.customerCountValue', { count: (current?.up_count ?? 0).toLocaleString('id-ID') })}
                    />
                    <SummaryCard
                      label={t('customerMetrics.m7.summaryFlatRate')}
                      value={`${(current?.flat_rate ?? 0).toFixed(1)}%`}
                      subValue={t('customerMetrics.m7.customerCountValue', { count: (current?.flat_count ?? 0).toLocaleString('id-ID') })}
                    />
                    {/* Inactive (susulan, sama hari — user: "datamu tidak valid
                        jika tanpa transaksi kamu beri label stabil") — kartu
                        terpisah dari Flat, bukan lagi digabung. */}
                    <SummaryCard
                      label={t('customerMetrics.m7.summaryInactiveRate')}
                      value={`${(current?.inactive_rate ?? 0).toFixed(1)}%`}
                      subValue={t('customerMetrics.m7.customerCountValue', { count: (current?.inactive_count ?? 0).toLocaleString('id-ID') })}
                    />
                    <SummaryCard
                      label={t('customerMetrics.m7.summaryDownRate')}
                      value={`${(current?.down_rate ?? 0).toFixed(1)}%`}
                      subValue={t('customerMetrics.m7.customerCountValue', { count: (current?.down_count ?? 0).toLocaleString('id-ID') })}
                    />
                    <SummaryCard label={t('customerMetrics.m7.summaryExisting')} value={(current?.existing_customers ?? 0).toLocaleString('id-ID')} />
                  </Box>
                )}
              </Box>

              <Box sx={{ flex: '1 1 300px' }}>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={168} />
                ) : (
                  <AreaChartWidget
                    title={t('customerMetrics.m7.overviewChartTitle')}
                    subtitle={t('customerMetrics.m7.overviewNetLabel')}
                    data={trendWithNet}
                    series={[{
                      key: 'net', label: t('customerMetrics.m7.overviewNetLabel'),
                      color: theme.palette.primary.main,
                      // grey[500] (bukan text.secondary yang agak ke-biru,
                      // koreksi user "tidak ada perubahan warna" — biru vs
                      // slate mirip di mata, abu netral true kontras lebih
                      // jelas thd biru solid).
                      negativeColor: theme.palette.grey[500],
                    }]}
                    xKey="month"
                    height={120}
                    xAxisFormatter={(label) => formatPeriodLabelShort(periodType, label)}
                    yAxisFormatter={(v) => `${v}%`}
                  />
                )}
              </Box>
            </Box>

            <Box>
              <SectionLabel label={t('customerMetrics.m7.overviewTopMoversLabel')} />
              {isLoading || currentBreakdownLoading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (
                <Card>
                  {topMovers.length === 0 ? (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">{t('customerMetrics.m7.emptyMessage')}</Typography>
                    </Box>
                  ) : (
                    topMovers.map((r, i) => (
                      <Box
                        key={r.ranking}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                          borderBottom: i < topMovers.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.disabled" sx={{ width: 20, fontWeight: 600 }}>{i + 1}</Typography>
                        <Typography variant="body2" sx={{ flex: 1 }} noWrap>{r.customer_name}</Typography>
                        <StatusChip label={statusLabel(r.status, t)} color={statusChipColor(r.status)} />
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110, textAlign: 'right' }}>{formatRupiah(r.cur_revenue)}</Typography>
                      </Box>
                    ))
                  )}
                </Card>
              )}
            </Box>
          </Box>
        )}

        {tab === 'trend' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <Box>
              {isLoading ? (
                <Skeleton variant="rectangular" height={340} />
              ) : (
                <>
                  <ExpansionChart
                    trend={trend}
                    height={320}
                    periodType={periodType}
                    onBarClick={(d) => setDrillDate(getPeriodDateRange(periodType, String(d.month ?? '')).end)}
                  />
                  <TrendSummary
                    metricLabel={t('customerMetrics.m7.seriesUp')}
                    data={trend}
                    accessor={(r) => r.up_rate}
                    labelAccessor={(r) => r.month}
                    formatValue={(v) => `${v.toFixed(1)}%`}
                  />
                </>
              )}
            </Box>

            {/* Breakdown table (2026-08-21, koreksi user: "aku sudah bilang
                M1 adalah standarisasi layout untuk KPI" — pola §28 WAJIB
                punya tabel breakdown SELALU tampil buat periode SEKARANG,
                bukan cuma dialog klik-titik). Reuse `currentBreakdown`
                (sama fetch yang dipakai Top Movers tab Overview, period_end
                = periodEnd halaman, BUKAN fetch baru) + `expansionColumns`
                yang sama dgn dialog — beda dari dialog cuma SEMUA baris
                ditampilkan (bukan slice 5) & selalu render tanpa perlu klik. */}
            <Box>
              <SectionLabel label={t('customerMetrics.m7.breakdownTableLabel')} />

              {/* Table Filter (§28.7/§28.9) — Search + Sort, pola SAMA
                  PERSIS BreakdownTable.tsx (CrossSelling) */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder={t('crossSelling.tableSearchPlaceholder')}
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 240 } }}
                />
                <TextField
                  select
                  size="small"
                  label={t('crossSelling.tableSortLabel')}
                  value={tableSort}
                  onChange={(e) => setTableSort(e.target.value as typeof tableSort)}
                  sx={{ width: { xs: '100%', sm: 200 } }}
                >
                  <MenuItem value="name">{t('crossSelling.tableSortName')}</MenuItem>
                  <MenuItem value="revenue_desc">{t('crossSelling.tableSortRevenueDesc')}</MenuItem>
                  <MenuItem value="change_desc">{t('customerMetrics.m7.tableSortChangeDesc')}</MenuItem>
                </TextField>
              </Box>

              <ResponsiveListView
                rows={breakdownRows.map((r) => ({ ...r, id: r.ranking }))}
                columns={expansionColumns}
                loading={isLoading || currentBreakdownLoading}
                height={480}
                pageSize={25}
                pageSizeOptions={[25, 50, 100]}
                emptyMessage={t('customerMetrics.m7.emptyMessage')}
                mobileFields={['customer_name', 'cur_revenue', 'change_pct', 'status']}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Expansion Breakdown Dialog — klik titik chart (fitur sama persis
          M7Expansion.tsx, direuse via useExpansionColumns) */}
      <Dialog
        open={!!drillDate}
        onClose={() => setDrillDate(null)}
        maxWidth="md"
        title={t('customerMetrics.m7.dialogTitle', { date: drillDate })}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={drillBreakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('customerMetrics.m7.dialogUpCount'),       String(drillBreakdown.up_count)],
              [t('customerMetrics.m7.dialogTotalExisting'), String(drillBreakdown.total_existing)],
              [t('customerMetrics.m7.dialogUpRate'),        `${drillBreakdown.total_existing > 0 ? ((drillBreakdown.up_count / drillBreakdown.total_existing) * 100).toFixed(1) : '0.0'}%`],
            ] as [string, string][]).map(([label, val]) => (
              <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{val}</Typography>
              </Box>
            ))}
          </Box>
        )}
      >
        <ResponsiveListView
          rows={(drillBreakdown?.rows ?? []).map((r) => ({ ...r, id: r.ranking }))}
          columns={expansionColumns}
          loading={drillLoading}
          height={420}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('customerMetrics.m7.emptyMessage')}
          mobileFields={['customer_name', 'cur_revenue', 'change_pct', 'status']}
        />
      </Dialog>
    </Box>
  );
}
