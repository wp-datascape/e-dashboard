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
import BedtimeIcon from '@mui/icons-material/Bedtime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { Card, Dialog } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { formatPeriodLabel, formatPeriodLabelShort, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday, getPreviousPeriodKey } from '@/utils/analisisPeriod';
import { useDormantBreakdown } from '@/hooks/useMetrics';
import type { DormantData } from '@/types/metrics';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from '../CustomerMetrics/HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { fmtRp } from './helpers';
import { useDormantBreakdownColumns } from './dormantHelpers';
import { useTheme } from '@mui/material/styles';

// Tooltip custom (2026-08-24, task029.md — susulan "lakukan juga untuk
// Dormant Customer Rate" setelah M6 distandarkan) — pola sama persis
// ChartTooltipCard M6/M1/M2/M7. Susulan (koreksi user: "tooltip cart info
// kurang lengkap dan tidak ada info klik") — baris jumlah dormant/total
// customer ditambahkan (cermin 3 kartu ringkasan di atas, tapi utk bulan
// yang di-hover, bukan cuma bulan berjalan), hint klik ditambahkan (chart
// ini SUDAH bisa diklik via onPointClick, sebelumnya tidak diberi tahu).
function M8Tooltip({ active, payload, alertPct, periodType }: TooltipContentProps<number, string> & { alertPct: number; periodType: PeriodGranularity }) {
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as { month: string; dormant_rate: number; dormant_count: number; total_customers: number };

  return (
    <ChartTooltipCard
      title={t('dormantCustomer.m8TooltipTitle', { month: formatPeriodLabelShort(t, periodType, d.month) })}
      rows={[
        { label: t('dormantCustomer.lineLabelDormantRate'), value: `${d.dormant_rate.toFixed(1)}%` },
        { label: t('dormantCustomer.thresholdLabelPct', { alertPct }), value: `${alertPct}%` },
        { label: t('dormantCustomer.dormantCountLabel'), value: d.dormant_count.toLocaleString('id-ID') },
        { label: t('dormantCustomer.totalCustomerLabel'), value: d.total_customers.toLocaleString('id-ID') },
      ]}
      hint={t('dormantCustomer.m8TooltipClickHint')}
    />
  );
}

// M8 (Dormant Customer Rate, task029.md §13). Diekstrak dari
// DormantCustomer/index.tsx (2026-08-19, task029) supaya bisa dipakai ulang
// di halaman Retention — chart yang sudah ada, bukan dibuat ulang.
//
// Layout distandarkan ke pola M6/M1/M7 (2026-08-24, instruksi user:
// "Lakukan juga untuk Dormant Customer Rate") — panel angka current yang
// dulu di SAMPING chart (grid kanan: rate+status+jumlah dormant+total
// customer) DIPINDAH jadi 3 kartu ringkasan DI ATAS card (instruksi user:
// "sepertinya untuk card sumary sudah ada datanya dicard kanan cart" — data
// SAMA PERSIS, cuma dipindah posisinya, bukan fetch baru).
//
// Top 5 (2026-08-24, susulan — user: "Top 5 nya belum ada") — REUSE
// `data.value_ranking` (data SAMA yang dipakai M9DormantValue.tsx, sudah
// ter-fetch bareng `data` prop, BUKAN fetch baru) — top 5 customer dgn
// estimasi kerugian terbesar, representasi "top 5" paling relevan utk
// dormant (siapa yang paling penting direaktivasi), bukan sekadar ranking
// generik.
//
// Drill-down klik chart (2026-08-24, susulan — sebelumnya MEMANG TIDAK ADA,
// dijawab ke user "bukan bug, endpoint breakdown-nya belum pernah dibuat",
// lalu instruksi user: "Buatkan end poin dril down breakdown singkat,
// lengkapnya nanti di tabel laporan") — endpoint backend BARU
// `GET /metrics/dormant-breakdown` (`getDormantBreakdown` service, reuse
// `fetchDormantValueRanking` dgn limit=null — SEMUA customer dormant di
// period_end yg diklik, bukan cuma top 20 spt M9). Versi ini SENGAJA
// ringkas (kolom seadanya: nama/kode/transaksi terakhir/lama dormant/
// estimasi kerugian) — kolom lebih lengkap menyusul di halaman Laporan
// terpisah nanti, BUKAN scope perubahan ini.
interface Props {
  data: DormantData | undefined;
  isLoading: boolean;
  /** Granularitas trend (2026-08-24, susulan task029.md §30.9 poin 1 —
   * M8-M10 sekarang granularitas-aware, backend sudah digeneralisasi).
   * Default 'monthly' kalau caller belum wired (workbench DormantCustomer/
   * index.tsx, belum punya filter granularitas). */
  periodType?: PeriodGranularity;
  /** Apply date cutoff aktif (2026-08-24) — kalau true, label titik trend =
   * bulan data yang sama (mode lama, day-level cutoff). Kalau false/default,
   * backend GESER data 1 periode ke belakang dari labelnya (titik "Agustus"
   * isinya data Juli, definisi eksplisit user "dormant agustus = tanpa
   * transaksi mei, juni, juli") — drilldown klik-titik ikut geser supaya
   * konsisten dgn angka yang ditampilkan titik itu. */
  applyDateCutoff?: boolean;
  companyId: number | 'all';
  branchId?: number;
  division?: number;
  excludeIntercompany?: boolean;
  onlyPareto?: boolean;
}

export function M8DormantRate({ data, isLoading, periodType = 'monthly', applyDateCutoff = false, companyId, branchId, division, excludeIntercompany, onlyPareto }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const drc = data?.dormant_rate_current;
  const alertPct = drc?.alert_pct ?? 10;
  const isAboveAlert = (drc?.value ?? 0) > alertPct;
  const [drillDate, setDrillDate] = useState<string | null>(null);
  // Label titik yang DIKLIK user (2026-08-24, koreksi keras user: "NGAPAIN
  // LU BERI JUDUL DORMANT 07-2026" — `drillDate` (dipakai query API) bisa
  // berisi bulan DATA yang sudah digeser (Juli, kalau titik "Agustus" yang
  // diklik) — TIDAK BOLEH bocor ke judul dialog. Judul HARUS selalu pakai
  // label titik chart yang diklik ("Agustus"), disimpan terpisah di sini.
  const [drillLabel, setDrillLabel] = useState<string | null>(null);
  const breakdownColumns = useDormantBreakdownColumns(t);
  // Titik trend YANG DIKLIK (2026-08-24, susulan "info drilldown dormant
  // customer belum lengkap") — dipakai subtitle dialog di bawah utk
  // Total Pelanggan/Pelanggan Aktif di TITIK ITU (bukan cuma titik
  // terakhir spt kartu ringkasan di atas chart).
  const drillTrendPoint = drillLabel ? data?.trend.find((pt) => pt.month === drillLabel) : undefined;

  // Header perbandingan YoY (2026-08-24, ditegur keras user: "sudah bilang
  // Growth sebagai standar layout" — pola KpiHeader (current vs YoY + chip
  // delta) sudah ada di M7ExpansionGrowth.tsx, disambung ke M8 di sini.
  // `dormant_rate_current.comparison_value` SUDAH dihitung backend (YATIM
  // sebelumnya). `periodKey` dari label titik trend TERAKHIR.
  const periodKey = data?.trend.at(-1)?.month ?? '';
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';
  const yoyComparisonLabel = periodKey ? formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey)) : '';

  // Sub-text kartu "Jumlah Dormant"/"Total Customer" (2026-08-24, instruksi
  // user: "menu growth mencantumkan periodenya") — koreksi (sama hari,
  // user tunjukkan screenshot: kartu bilang "Kuartal 2" padahal chart di
  // sampingnya bilang "Kuartal 3" utk ANGKA YANG SAMA): sub-text HARUS
  // pakai `currentPeriodLabel` (label titik chart ASLI, SAMA PERSIS yang
  // dipakai KpiHeader persis di bawah kartu ini), BUKAN dihitung ulang dari
  // window data yang sudah digeser (`getPreviousPeriodKey`) — itu balik ke
  // bug class "NGAPAIN LU BERI JUDUL DORMANT 07-2026" yang sudah pernah
  // diperbaiki sebelumnya (label ke user SELALU label asli, TIDAK PERNAH
  // bulan data mentah walau angkanya scr teknis dihitung dari situ).

  const { data: breakdown, isLoading: breakdownLoading } = useDormantBreakdown({
    period_end: drillDate,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  const top5Items: TopMoverItem[] = (data?.value_ranking ?? []).slice(0, 5).map((r) => ({
    id: r.customer_id,
    name: r.customer_name,
    metricText: fmtRp(r.estimated_lost_value),
    icon: BedtimeIcon,
    iconColor: theme.palette.error.main,
  }));

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.dormantRateCurrentLabel')}
              value={`${drc?.value ?? 0}%`}
              sub={isAboveAlert ? t('dormantCustomer.aboveAlert', { alertPct }) : t('dormantCustomer.belowAlert', { alertPct })}
              color={isAboveAlert ? theme.palette.error.main : theme.palette.success.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.dormantCountLabel')}
              value={(drc?.dormant_count ?? 0).toLocaleString('id-ID')}
              sub={currentPeriodLabel}
              color={theme.palette.error.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.totalCustomerLabel')}
              value={(drc?.total_customers ?? 0).toLocaleString('id-ID')}
              sub={currentPeriodLabel}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ p: 2.5 }}>
          {/* Info tooltip (2026-08-24, koreksi user: "Dormant rate tooltip
              belum kamu perbaiki" — M6/M1/M2/M7 semua punya ikon info di
              sebelah judul, M8 kelewatan waktu restrukturisasi awal). */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SectionLabel label={t('dormantCustomer.m8ChartTitle')} icon={BedtimeIcon} />
            <MuiTooltip
              title={t('dormantCustomer.m8TooltipInfo')}
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
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={280} />
              ) : (
                <LineAlertWidget
                  data={data?.trend ?? []}
                  lineKey="dormant_rate"
                  lineLabel={t('dormantCustomer.lineLabelDormantRate')}
                  xKey="month"
                  threshold={alertPct}
                  thresholdLabel={t('dormantCustomer.thresholdLabelPct', { alertPct })}
                  height={280}
                  variant="area"
                  yAxisMin={-5}
                  xAxisFormatter={(label) => formatPeriodLabelShort(t, periodType, label)}
                  renderTooltip={(props) => <M8Tooltip {...props} alertPct={alertPct} periodType={periodType} />}
                  onPointClick={(d) => {
                    const month = String(d.month ?? '');
                    const dataMonth = applyDateCutoff ? month : getPreviousPeriodKey(periodType, month);
                    setDrillLabel(month);
                    setDrillDate(clampPeriodEndToToday(periodType, dataMonth, getPeriodDateRange(periodType, dataMonth).end));
                  }}
                  headerContent={
                    <KpiHeader
                      current={drc?.value ?? 0}
                      yoy={drc?.comparison_value ?? 0}
                      kpiType="rate"
                      currentPeriodLabel={currentPeriodLabel}
                      comparisonLabel={yoyComparisonLabel}
                      // higherIsBetter=false (2026-08-24, koreksi user via
                      // screenshot: "ini kenaikan dormant, bukan omset,
                      // kenapa kamu pakai warna hijau?") — Dormant Rate naik
                      // = customer makin banyak hilang, harus merah.
                      higherIsBetter={false}
                    />
                  }
                />
              )}
            </Grid>

            {/* display:flex+flexDirection:'column' (2026-08-24, ditegur user:
                "SUDAH LU KERJAIN>>>>" + screenshot pola M1) — info icon di
                judul Top 5 + tombol "Cek Detail di Laporan" pojok kanan
                bawah, pola SAMA PERSIS M1CrossSelling.tsx. */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box>
                  <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SectionLabel label={t('dormantCustomer.m8TopCustomersLabel')} />
                    <MuiTooltip
                      title={t('dormantCustomer.m8TopCustomersInfo')}
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  <TopMoversTimeline items={top5Items} emptyMessage={t('dormantCustomer.m8TopCustomersEmpty')} />
                </Box>
              )}
              {!isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/report/retention?tab=dormant')}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    {t('dormantCustomer.viewDetailInReport')}
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* Dormant Breakdown Dialog (2026-08-24, instruksi user: "Buatkan end
          poin dril down breakdown singkat, lengkapnya nanti di tabel
          laporan") — pola sama persis dialog M6, versi ringkas (kolom
          seadanya) — kolom lebih lengkap menyusul di halaman Laporan. */}
      <Dialog
        open={!!drillDate}
        onClose={() => { setDrillDate(null); setDrillLabel(null); }}
        maxWidth="md"
        title={t('dormantCustomer.dialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        // Standar layout drilldown (2026-08-24, instruksi user: "periode
        // jadikan sebagai keterangan jangan judul, pindahkan dari judul") —
        // title cuma nama entitas, subtitle baris pertama = periode. BEDA
        // dari M6/M7/M10 (rentang tanggal `start s/d end`) — M8 snapshot 1
        // titik, bukan rentang, jadi tampilkan LABEL periode (`drillLabel`,
        // natural/tidak digeser — SAMA aturan "label ke user selalu label
        // asli" yang sudah dipakai di judul sebelumnya, cuma dipindah
        // posisinya, BUKAN `drillDate` yang isinya window data digeser).
        //
        // Ringkasan Total/Aktif/Dormant (susulan, sama hari, instruksi user:
        // "info drilldown dormant customer belum lengkap, belum ada info
        // tambahan seperti total pelanggan, hanya ada pelanggan dormant
        // saja") — `drillTrendPoint` = titik trend YANG DIKLIK (bukan cuma
        // titik terakhir spt kartu ringkasan di atas chart), total_customers/
        // active_count SUDAH dikirim backend per titik (task027 §8e), tipe
        // FE sebelumnya belum deklarasikan field ini (lihat DormantTrendPoint,
        // types/metrics.ts) — bukan fetch baru, cuma nyambung yg sudah ada.
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('dormantCustomer.dialogPeriodLabel', { label: drillLabel ? formatPeriodLabel(t, periodType, drillLabel) : '…' })}
            </Typography>
            {([
              [t('dormantCustomer.m8SummaryTotal'), (drillTrendPoint?.total_customers ?? 0).toLocaleString('id-ID')],
              [t('dormantCustomer.m8SummaryActive'), (drillTrendPoint?.active_count ?? 0).toLocaleString('id-ID')],
              [t('dormantCustomer.dialogDormantCount'), breakdown.rows.length.toLocaleString('id-ID')],
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
          rows={(breakdown?.rows ?? []).map((r) => ({ ...r, id: r.customer_id }))}
          columns={breakdownColumns}
          loading={breakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('dormantCustomer.m8TopCustomersEmpty')}
          mobileFields={['customer_name', 'months_dormant', 'estimated_lost_value', 'estimated_lost_gp']}
        />
      </Dialog>
    </>
  );
}
