import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';
import type { TooltipContentProps } from 'recharts';

import { BarChartWidget } from '@/components/charts/BarChartWidget';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { Card, Dialog } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { formatPeriodLabel, getYoyPeriodKey } from '@/utils/analisisPeriod';
import { formatDateID } from '@/utils/date';
import { formatRupiah } from '@/utils/format';
import { useDormantValueHistory } from '@/hooks/useMetrics';
import type { DormantData, DormantValueRankingRow } from '@/types/metrics';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from '../CustomerMetrics/HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { fmtRp } from './helpers';

// Kolom dialog riwayat revenue (2026-08-25, drilldown M9 klik-bar —
// instruksi user: "list revenue customer tersebut selama 12 bulan sebagai
// list") — dipisah dari komponen (bukan didefinisikan di dalam function
// M9DormantValue) krn ESLint react-refresh/only-export-components, pola
// sama persis useDormantBreakdownColumns dkk (dormantHelpers.tsx) — tapi
// fungsi ini cuma dipakai SEKALI di sini, tidak perlu diekstrak ke file
// terpisah. Nilai Rupiah pakai `formatRupiah` (angka PENUH, bukan
// disingkat) — koreksi user: kartu ringkasan boleh disingkat (`fmtRp`),
// tapi TABEL/dialog standarnya angka penuh (lihat JSDoc formatRupiah).
function useHistoryColumns(t: TFunction): GridColDef[] {
  return [
    { field: 'month',   headerName: t('dormantCustomer.m9HistoryColMonth'), flex: 1, minWidth: 140, sortable: false,
      renderCell: (p) => formatPeriodLabel(t, 'monthly', p.value as string) },
    { field: 'revenue', headerName: t('customerMetrics.m6.colTotalRevenue'), width: 160, align: 'right', headerAlign: 'right', sortable: false,
      renderCell: (p) => formatRupiah(p.value as number) },
  ];
}

// Tooltip custom (2026-08-25, koreksi user: "tootlip custom belum" — M9
// SATU-SATUNYA KPI di Retention yang masih pakai tooltipFormatter bawaan
// BarChartWidget, bukan ChartTooltipCard spt M1/M2/M6/M7/M8/M10) — payload
// bar chart M9 berisi seluruh field baris ranking (bukan cuma
// customer_name/estimated_lost_value), jadi tooltip bisa tampilkan konteks
// yang sama dgn dialog drilldown (divisi/lama dormant) sekalian, hint klik
// pola sama persis KPI lain.
function M9Tooltip({ active, payload }: TooltipContentProps<number, string>) {
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as DormantValueRankingRow;

  return (
    <ChartTooltipCard
      title={d.customer_name}
      rows={[
        { label: t('dormantCustomer.colEstimatedLoss'), value: formatRupiah(d.estimated_lost_value) },
        { label: t('dormantCustomer.colEstimatedLossGp'), value: formatRupiah(d.estimated_lost_gp) },
        { label: t('common.filters.division'), value: d.division_label ?? '—' },
        { label: t('dormantCustomer.colMonthsDormant'), value: t('dormantCustomer.monthsDormantValue', { count: d.months_dormant }) },
        { label: t('dormantCustomer.colLastInvoice'), value: formatDateID(d.last_invoice_date) },
      ]}
      hint={t('dormantCustomer.m9TooltipClickHint')}
    />
  );
}

// M9 (Dormant Customer Value, task029.md §14). Diekstrak dari
// DormantCustomer/index.tsx (2026-08-19, task029) supaya bisa dipakai ulang
// di halaman Retention — chart yang sudah ada, bukan dibuat ulang.
//
// Layout distandarkan ke pola M6/M8/M10 (2026-08-24, instruksi user: "Tata
// layout M9 seperti layout lainnya") — 3 kartu ringkasan + Card(SectionLabel
// berikon+info tooltip + KpiHeader YoY + tombol "Cek Detail di Laporan").
// TIDAK ada Top 5 sidebar terpisah (beda dari M6/M8/M10) — bar chart M9
// SUDAH JADI daftar top-N ranking itu sendiri (bukan trend+ranking terpisah
// spt KPI lain), jadi tetap full-width, bukan dipaksa split 8/4.
interface Props {
  data: DormantData | undefined;
  isLoading: boolean;
  /** Granularitas (2026-08-24) — dipakai label periode KpiHeader saja,
   * default 'monthly' kalau caller belum wired. */
  periodType?: PeriodGranularity;
  /** Scope filter (2026-08-25, drilldown M9 klik-bar) — dibutuhkan query
   * riwayat revenue per customer supaya konsisten dgn scope RBAC/filter
   * halaman (branch/division/exclude_intercompany), pola sama persis
   * M8/M10. */
  companyId?: number | 'all';
  branchId?: number;
  division?: number;
  excludeIntercompany?: boolean;
  onlyPareto?: boolean;
}

export function M9DormantValue({ data, isLoading, periodType = 'monthly', companyId = 'all', branchId, division, excludeIntercompany, onlyPareto }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const historyColumns = useHistoryColumns(t);

  // Drilldown klik-bar (2026-08-25, instruksi user: "Nama customer, divisi,
  // berapa lama dia dormant, tanggal transaksi terakhirnya... list revenue
  // customer tersebut selama 12 bulan") — header dialog pakai data BARIS
  // yang diklik langsung (SUDAH ter-fetch bareng ranking, TIDAK fetch
  // ulang), cuma LIST 12 bulannya yang fetch baru.
  const [drillCustomer, setDrillCustomer] = useState<DormantValueRankingRow | null>(null);
  const { data: history, isLoading: historyLoading } = useDormantValueHistory({
    customerId: drillCustomer?.customer_id ?? null,
    refDate: drillCustomer?.last_invoice_date ?? null,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  const ranking = data?.value_ranking ?? [];
  const topCustomer = ranking[0];
  const periodKey = data?.trend.at(-1)?.month ?? '';
  // currentPeriodLabel (2026-08-24, instruksi user: "menu growth
  // mencantumkan periodenya", DIKOREKSI sama hari — user tunjukkan
  // screenshot M8: kartu bilang "Kuartal 2" padahal chart di sampingnya
  // bilang "Kuartal 3" utk angka yang sama) — dipakai LANGSUNG sbg sub-text
  // 2 kartu di bawah juga, BUKAN dihitung ulang dari window data yang sudah
  // digeser (`value_ranking` M9 sumbernya SAMA persis M8, kena bug class
  // yang sama) — label ke user SELALU label titik chart asli, TIDAK PERNAH
  // window data mentah, sama seperti KpiHeader di bawah.
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';
  const yoyComparisonLabel = periodKey ? formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey)) : '';

  return (
    <>
      {/* Grid 4 kartu (2026-08-26, task029.md §36.12 — susulan "Tambah versi
          Gross Profit paralel") — sebelumnya 3 kartu md:4, sekarang md:3
          utk kartu GP baru di posisi ke-2 (di sebelah Total Loss revenue,
          sebelum Ranked Count/Highest Loss). */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.m9TotalLossLabel')}
              value={fmtRp(data?.value_ranking_total_current ?? 0)}
              sub={currentPeriodLabel}
              color={theme.palette.error.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.m9TotalLossGpLabel')}
              value={fmtRp(data?.value_ranking_total_gp_current ?? 0)}
              sub={currentPeriodLabel}
              color={theme.palette.error.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.m9RankedCountLabel')}
              value={ranking.length.toLocaleString('id-ID')}
              sub={currentPeriodLabel}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.m9HighestLossLabel')}
              value={fmtRp(topCustomer?.estimated_lost_value ?? 0)}
              sub={topCustomer?.customer_name ?? t('dormantCustomer.m8TopCustomersEmpty')}
              color={theme.palette.warning.main}
            />
          )}
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SectionLabel label={t('dormantCustomer.m9ChartTitle')} icon={MoneyOffIcon} />
            <MuiTooltip
              title={t('dormantCustomer.m9TooltipInfo')}
              placement="top"
              arrow
              slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' } } }}
            >
              <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                <InfoOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        <Box sx={{ p: 2.5 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={520} />
          ) : (
            <>
              <KpiHeader
                current={data?.value_ranking_total_current ?? 0}
                yoy={data?.value_ranking_total_comparison ?? 0}
                kpiType="value"
                formatValue={fmtRp}
                currentPeriodLabel={currentPeriodLabel}
                comparisonLabel={yoyComparisonLabel}
                // higherIsBetter=false — total potensi kerugian naik = makin
                // banyak omset hilang, harus merah (sama pola M8 Dormant Rate).
                higherIsBetter={false}
              />
              <BarChartWidget
                data={ranking}
                series={[
                  {
                    key: 'estimated_lost_value',
                    label: t('dormantCustomer.m9SeriesLabel'),
                    color: theme.palette.error.main,
                  },
                ]}
                xKey="customer_name"
                height={480}
                layout="horizontal"
                yAxisWidth={200}
                showLabels
                mobileNameInBar
                labelFormatter={(v) => fmtRp(v)}
                yAxisFormatter={(v) => fmtRp(v)}
                renderTooltip={(props) => <M9Tooltip {...props} />}
                // onBarClick (2026-08-25, instruksi user: "Aku lebih ingin
                // info Nama customer, divisi, berapa lama dia dormant,
                // tanggal transaksi terakhirnya... list revenue customer
                // tersebut selama 12 bulan") — data point dari Recharts
                // SUDAH berisi seluruh field baris `ranking` asli (bukan
                // cuma xKey/series), jadi header dialog bisa langsung pakai
                // baris ini, TANPA fetch ulang.
                onBarClick={(d) => setDrillCustomer(d as unknown as DormantValueRankingRow)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/report/retention?tab=dormant')}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  {t('dormantCustomer.viewDetailInReport')}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Card>

      {/* Dialog drilldown klik-bar (2026-08-25, instruksi user: "Nama
          customer, divisi, berapa lama dia dormant, tanggal transaksi
          terakhirnya... list revenue customer tersebut selama 12 bulan
          sebagai list") — title = nama customer, subtitle = divisi/lama
          dormant/transaksi terakhir (dari baris yang diklik langsung),
          isi = tabel revenue 12 bulan (fetch baru, satu-satunya bagian yang
          benar-benar butuh data baru). */}
      <Dialog
        open={!!drillCustomer}
        onClose={() => setDrillCustomer(null)}
        maxWidth="sm"
        title={drillCustomer?.customer_name ?? ''}
        showCloseButton
        contentSx={{ p: 1 }}
        subtitle={drillCustomer && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            {([
              [t('common.filters.division'), drillCustomer.division_label ?? '—'],
              [t('dormantCustomer.colMonthsDormant'), t('dormantCustomer.monthsDormantValue', { count: drillCustomer.months_dormant })],
              [t('dormantCustomer.colLastInvoice'), formatDateID(drillCustomer.last_invoice_date)],
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
          // Urutan terbaru dulu (2026-08-25, instruksi user: "sortir data
          // dari terbaru, jangan dari terlama") — backend kembalikan
          // ASCENDING (kronologis, bulan tertua dulu, urutan natural utk
          // hitung window 12 bulan), dibalik di sini KHUSUS tampilan list.
          rows={[...(history?.rows ?? [])].reverse().map((r) => ({ ...r, id: r.month }))}
          columns={historyColumns}
          loading={historyLoading}
          height={360}
          pageSize={12}
          pageSizeOptions={[12]}
          emptyMessage={t('dormantCustomer.m9HistoryEmptyMessage')}
          mobileFields={['month', 'revenue']}
        />
      </Dialog>
    </>
  );
}
