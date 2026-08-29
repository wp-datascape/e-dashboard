import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';
import { useTheme } from '@mui/material/styles';

import { LineAlertWidget } from '@/components/charts/LineAlertWidget';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { Card, Dialog } from '@/components/ui';
import { KpiHeader } from '@/components/dashboard/KpiHeader';
import { TopMoversTimeline } from '@/components/dashboard/TopMoversTimeline';
import type { TopMoverItem } from '@/components/dashboard/TopMoversTimeline';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { formatDateID } from '@/utils/date';
import { formatPeriodLabel, formatPeriodLabelShort, formatPeriodRangeSub, getYoyPeriodKey, getPeriodDateRange, clampPeriodEndToToday } from '@/utils/analisisPeriod';
import { useDormantStatusBreakdown } from '@/hooks/useMetrics';
import type { DormantData } from '@/types/metrics';
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter';
import { SectionLabel } from '../CustomerMetrics/HelperComponents';
import { KpiCard } from '../CrossSelling/HelperComponents';
import { useDormantStatusColumns } from './dormantHelpers';

// M10 (Customer Reactivation Rate, task029.md §15). Diekstrak dari
// DormantCustomer/index.tsx (2026-08-19, task029) supaya bisa dipakai ulang
// di halaman Retention — chart yang sudah ada, bukan dibuat ulang.
//
// Layout distandarkan ke pola M6/M8 (2026-08-24, instruksi user: "buatkan
// juga 3 card summary diatas cart, dan top 5" + "Perbaikan tooltip di
// judul, dan tooltip custom dengan keterangan klik di cart") —
// BulletChartWidget (gauge current-vs-target) DIHAPUS, redundan dengan
// kartu ringkasan #1 yang baru. SectionLabel pindah ke `CustomerMetrics/
// HelperComponents` (versi berikon, sama seperti M6/M8) menggantikan versi
// lokal tanpa ikon.
interface Props {
  data: DormantData | undefined;
  isLoading: boolean;
  /** Granularitas trend (2026-08-24, susulan task029.md §30.9 poin 1).
   * Default 'monthly' kalau caller belum wired. */
  periodType?: PeriodGranularity;
  /** Apply date cutoff (2026-08-27, task029.md §36.56) — dipakai dialog
   * "Status Customer" mode ringkasan (drillStart kosong, BUKAN klik titik
   * chart historis) supaya kartu "Dormant" rekonsiliasi PERSIS ke kartu KPI
   * M8 di kedua mode (lihat rumus di counts.dormant di bawah). Default
   * false — caller lama (DormantCustomer/index.tsx, tidak punya filter
   * cutoff) tetap sama persis. */
  applyDateCutoff?: boolean;
  companyId?: number | 'all';
  branchId?: number;
  division?: number;
  excludeIntercompany?: boolean;
  onlyPareto?: boolean;
}

// Tooltip custom (2026-08-24, instruksi user: "Perbaikan tooltip di judul,
// dan tooltip custom dengan keterangan klik di cart") — pola sama persis
// M6Tooltip/M8Tooltip, ChartTooltipCard atomic, hint klik di dalam tooltip
// (bukan caption terpisah di bawah chart lagi).
function M10Tooltip({ active, payload, targetLow, periodType }: TooltipContentProps<number, string> & { targetLow: number; periodType: PeriodGranularity }) {
  const { t } = useTranslation();
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as { month: string; reactivation_rate: number; reactivated_count: number; dormant_count: number };

  return (
    <ChartTooltipCard
      title={t('dormantCustomer.m10TooltipTitle', { month: formatPeriodLabelShort(t, periodType, d.month) })}
      rows={[
        { label: t('dormantCustomer.lineLabelReactivationRate'), value: `${d.reactivation_rate.toFixed(1)}%` },
        { label: t('dormantCustomer.targetMinLabel', { targetLow }), value: `${targetLow}%` },
        { label: t('dormantCustomer.reactivatedCountLabel'), value: d.reactivated_count.toLocaleString('id-ID') },
        // dormant_count (2026-08-26, task029.md §36.13 — koreksi konsistensi:
        // kartu ringkasan SUDAH diganti dari prev_dormant_count ke
        // dormant_count 2026-08-24 (basis DENOMINATOR reactivation_rate yang
        // benar, prev_dormant_count itu snapshot BEDA titik/prev_me), tapi
        // tooltip hover chart ini TERLEWAT, masih pakai prev_dormant_count —
        // sekarang disamakan, biar reactivated_count/[baris ini] = rate yang
        // ditampilkan di baris pertama, bukan angka lain.
        { label: t('dormantCustomer.dormantCountLabel'), value: d.dormant_count.toLocaleString('id-ID') },
      ]}
      hint={t('dormantCustomer.m10TooltipClickHint')}
    />
  );
}

export function M10ReactivationRate({ data, isLoading, periodType = 'monthly', applyDateCutoff = false, companyId = 'all', branchId, division, excludeIntercompany, onlyPareto }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const rc = data?.reactivation_current;
  const targetLow = rc?.target_low ?? 15;
  const last = data?.trend.at(-1);
  const isOnTarget = (rc?.value ?? 0) >= targetLow;
  const statusColumns = useDormantStatusColumns(t);

  // Header perbandingan YoY (2026-08-24, ditegur keras user: "kamu sudah
  // aku bilang menu Growth sebagai standar layout" — pola KpiHeader
  // current-vs-YoY+chip delta SUDAH ada di M7ExpansionGrowth.tsx, belum
  // pernah disambung ke M8/M10/M6. Backend `reactivation_current.
  // comparison_value` SUDAH dihitung (YoY, periode sama setahun lalu) —
  // sebelumnya YATIM, sekarang disambung. `periodKey` diambil dari label
  // titik trend TERAKHIR (`last.month`, SUDAH label kalender asli berkat
  // fix "Agustus" sebelumnya), bukan prop baru.
  const periodKey = last?.month ?? '';
  const currentPeriodLabel = periodKey ? formatPeriodLabel(t, periodType, periodKey) : '';
  const yoyComparisonLabel = periodKey ? formatPeriodLabel(t, periodType, getYoyPeriodKey(periodType, periodKey)) : '';

  // Sub-text kartu "Jumlah Reaktivasi" (2026-08-24, instruksi user: "menu
  // growth mencantumkan periodenya") — window LIVE periode berjalan (sama
  // seperti definisi reaktivasi itu sendiri, TIDAK digeser, pola SAMA
  // PERSIS Growth/M7).
  const livePeriodRange = periodKey ? getPeriodDateRange(periodType, periodKey) : null;
  const livePeriodEnd = livePeriodRange ? clampPeriodEndToToday(periodType, periodKey, livePeriodRange.end) : null;
  const reactivatedPeriodSub = (periodKey && livePeriodRange && livePeriodEnd)
    ? formatPeriodRangeSub(t, periodType, periodKey, livePeriodRange.start, livePeriodEnd)
    : '';
  // Kartu "Jumlah Dormant" (angka SAMA PERSIS kartu M8) — DIKOREKSI sama
  // hari, user tunjukkan screenshot M8 dgn bug yang sama: kartu sub-text
  // sempat dihitung ulang dari window data yang sudah digeser
  // (`getPreviousPeriodKey`), hasilnya "Kuartal 2" padahal chart di
  // sampingnya bilang "Kuartal 3" utk angka yang sama. Sub-text SELALU
  // `currentPeriodLabel` (label titik chart asli), lihat komentar sama di
  // M8DormantRate.tsx.
  const dormantCountPeriodSub = currentPeriodLabel;

  // Top 5 (2026-08-24, instruksi user: "buatkan juga 3 card summary diatas
  // cart, dan top 5") — REUSE `data.reactivated_customers` (SUDAH di-fetch
  // bareng data utama, backend filter status reactivated+newlyDormant pada
  // bucket TERAKHIR trend, lihat getDormantCustomerMetrics), bukan fetch
  // baru — pola sama persis M8 (value_ranking) dan M6 (breakdown periode
  // terbaru).
  const top5Items: TopMoverItem[] = (data?.reactivated_customers ?? []).slice(0, 5).map((r) => ({
    id: r.customer_id,
    name: r.customer_name,
    metricText: r.reactivation_date ? formatDateID(r.reactivation_date) : '—',
    icon: RestartAltIcon,
    iconColor: r.status === 'newlyDormant' ? theme.palette.warning.main : theme.palette.success.main,
  }));

  // Drill-down status per customer (2026-08-24, susulan pertanyaan user soal
  // ambiguitas reaktivasi: "datanya juga butuh existing, dormant, active,
  // reactive, dan yang active tapi dormant lagi... tercatat kapan masuk
  // active kapan masuk dormant, tapi dalam perhitungan masukkan status
  // terakhir saja"). Angka trend/reactivation_current TETAP net status
  // akhir saja (tidak berubah) — dialog ini cuma PEMBONGKARAN per-customer
  // dari angka yang sama, plus tanggal transisi.
  const [drillStart, setDrillStart] = useState<string | null>(null);
  const [drillEnd, setDrillEnd] = useState<string | null>(null);
  // drillMonth (2026-08-25, susulan koreksi user di M1 — dialog subtitle
  // butuh label periode NATURAL titik yang diklik, spy formatPeriodRangeSub
  // bisa tampilkan label granularitas lebar, bukan cuma rentang tanggal).
  const [drillMonth, setDrillMonth] = useState<string | null>(null);

  const { data: breakdown, isLoading: breakdownLoading } = useDormantStatusBreakdown({
    period_end: drillEnd,
    date_from: drillStart ?? undefined,
    period_type: periodType,
    // apply_date_cutoff (2026-08-27, §36.56) — backend abaikan param ini
    // otomatis saat date_from terisi (mode klik-titik historis), jadi aman
    // dikirim selalu tanpa perlu dikondisikan di sini.
    apply_date_cutoff: applyDateCutoff,
    company_id: companyId,
    branch_id: branchId,
    division,
    exclude_intercompany: excludeIntercompany,
    only_pareto: onlyPareto,
  });

  // Ringkasan 4 status (2026-08-24) — dihitung dari SEMUA baris hasil fetch
  // (aktif/dormant/reaktivasi/reaktivasi-lalu-dormant-lagi), ditampilkan
  // sbg info non-klik di atas list (instruksi user: "ringkasannya tetap
  // pakai [screenshot chip lama], jadikan seperti M2 drilldown menjadi info
  // di atas list" — pola sama persis subtitle Dialog M2AvgCategory.tsx,
  // Box+Typography caption per baris, BUKAN StatusChip yang bisa diklik).
  const counts = useMemo(() => {
    const rows = breakdown?.rows ?? [];
    return {
      active:      rows.filter((r) => r.status === 'active').length,
      // inactive (2026-08-26, task029.md §36.28) — status BARU, split dari
      // 'active' lama (lihat JSDoc backend fetchCustomerDormantStatusLog).
      inactive:    rows.filter((r) => r.status === 'inactive').length,
      dormant:     rows.filter((r) => r.status === 'dormant').length,
      // newlyDormant (2026-08-26, task029.md §36.43) — customer yang sempat
      // reaktivasi lalu dormant lagi, NAMA BARU dari status lama 'relapsed'
      // (koreksi user: "Dormant kembali itu diganti nama menjadi
      // newlydormant, hanya itu" — logika TIDAK berubah, cuma nama/key).
      newlyDormant: rows.filter((r) => r.status === 'newlyDormant').length,
      reactivated: rows.filter((r) => r.status === 'reactivated').length,
    };
  }, [breakdown]);

  // List di bawah ringkasan SENGAJA cuma tampilkan kategori reaktivasi
  // (reactivated + newlyDormant) — instruksi user 2026-08-24: "Untuk di
  // drilldown tampilkan list customer kategory reactivasi saja, untuk
  // kategory lainnya detail kita pakai di tabel menu laporan". Endpoint
  // backend TETAP kembalikan SEMUA status (tidak dipangkas server-side) —
  // kategori aktif/dormant tetap tersedia utk halaman Laporan nanti (dan
  // dipakai ringkasan di atas), cuma difilter di sini utk list-nya.
  const reactivationRows = useMemo(
    () => (breakdown?.rows ?? []).filter((r) => r.status === 'reactivated' || r.status === 'newlyDormant'),
    [breakdown],
  );

  // Klik titik chart (2026-08-24, koreksi user: "reaktivasi adalah data
  // dormant yang telah diaktivasi DI PERIODE BERJALAN") — BEDA dari M8
  // (snapshot dormant, perlu digeser ke bulan data). M10 butuh window LIVE
  // periode yang diklik (kalau titik current, dipotong elapsed ke hari ini)
  // — backend (getDormantStatusBreakdown) yang urus baseline dormant-nya
  // sendiri (1 bulan sebelum date_from, pola sama persis resolvedBuckets
  // trend), TIDAK perlu digeser di sini.
  const handlePointClick = (d: Record<string, unknown>) => {
    const month = String(d.month ?? '');
    if (!month) return;
    const range = getPeriodDateRange(periodType, month);
    setDrillMonth(month);
    setDrillStart(range.start);
    setDrillEnd(clampPeriodEndToToday(periodType, month, range.end));
  };

  return (
    <>
      {/* 3 kartu ringkasan (2026-08-24, instruksi user: "buatkan juga 3
          card summary diatas cart") — pola sama persis M6/M8: metrik utama
          (Reactivation Rate) + 2 angka pendukung (jumlah reaktivasi + basis
          populasi dormant sebelumnya), semuanya dari titik trend TERAKHIR
          (data yang SUDAH di-fetch, tidak fetch baru). */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.reactivationRateCurrentLabel')}
              value={`${rc?.value ?? 0}%`}
              sub={isOnTarget ? t('dormantCustomer.onTargetReactivation', { targetLow }) : t('dormantCustomer.offTargetReactivation', { targetLow })}
              color={isOnTarget ? theme.palette.success.main : theme.palette.error.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.reactivatedCountLabel')}
              value={(last?.reactivated_count ?? 0).toLocaleString('id-ID')}
              sub={reactivatedPeriodSub}
              color={theme.palette.info.main}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {/* Snapshot dormant PERIODE INI (2026-08-24, koreksi user: "kenapa
              kamu tampilkan data dormant periode sebelumnya, yang
              diperlukan adalah snapshot periode ini" — sebelumnya kartu ini
              pakai prev_dormant_count, basis DENOMINATOR reactivation_rate
              yang kurang intuitif dibaca sekilas. dormant_count = angka
              SAMA PERSIS yang dipakai kartu "Jumlah Dormant" M8, keduanya
              turunan titik trend terakhir yang sama — reuse key i18n M8. */}
          {isLoading ? <Skeleton variant="rectangular" height={110} /> : (
            <KpiCard
              label={t('dormantCustomer.dormantCountLabel')}
              value={(last?.dormant_count ?? 0).toLocaleString('id-ID')}
              sub={dormantCountPeriodSub}
              color={theme.palette.error.main}
              info={t('dormantCustomer.dormantCountInfo')}
            />
          )}
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SectionLabel label={t('dormantCustomer.m10ChartTitle')} icon={RestartAltIcon} />
            <MuiTooltip
              title={t('dormantCustomer.m10TooltipInfo')}
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
                  lineKey="reactivation_rate"
                  lineLabel={t('dormantCustomer.lineLabelReactivationRate')}
                  xKey="month"
                  threshold={targetLow}
                  thresholdLabel={t('dormantCustomer.targetMinLabel', { targetLow })}
                  // higherIsBetter (2026-08-25, koreksi user M6, pola sama
                  // diterapkan di sini) — Reactivation Rate "Target Min X%",
                  // makin TINGGI makin bagus.
                  higherIsBetter
                  height={280}
                  variant="area"
                  yAxisMin={-5}
                  xAxisFormatter={(label) => formatPeriodLabelShort(t, periodType, label)}
                  renderTooltip={(props) => <M10Tooltip {...props} targetLow={targetLow} periodType={periodType} />}
                  onPointClick={handlePointClick}
                  headerContent={
                    <KpiHeader
                      current={rc?.value ?? 0}
                      yoy={rc?.comparison_value ?? 0}
                      kpiType="rate"
                      currentPeriodLabel={currentPeriodLabel}
                      comparisonLabel={yoyComparisonLabel}
                    />
                  }
                />
              )}
            </Grid>

            {/* display:flex+flexDirection:'column' (2026-08-24, ditegur user:
                "SUDAH LU KERJAIN>>>>" + screenshot pola M1 — info icon di
                judul Top 5 + tombol "Cek Detail di Laporan" pojok kanan
                bawah belum ada di M6/M8/M10, cuma header KpiHeader yang
                sempat disambung. Pola SAMA PERSIS M1CrossSelling.tsx). */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box>
                  <Box sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SectionLabel label={t('dormantCustomer.m10TopCustomersLabel')} />
                    <MuiTooltip
                      title={t('dormantCustomer.m10TopCustomersInfo')}
                      placement="top"
                      arrow
                      slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.6 } } }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, mb: 0.5, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                  <TopMoversTimeline items={top5Items} emptyMessage={t('dormantCustomer.m10ReactivationEmpty')} />
                </Box>
              )}
              {!isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto', pt: 1 }}>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/report/retention?tab=reactivation')}
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

      {/* Status breakdown dialog (2026-08-24) — klik titik chart di atas.
          Subtitle = ringkasan 4 status (info, bukan filter — pola sama
          persis Dialog M2AvgCategory.tsx), list di bawahnya khusus
          kategori reaktivasi (reactivated + newlyDormant) saja. */}
      <Dialog
        open={!!drillEnd}
        onClose={() => { setDrillEnd(null); setDrillStart(null); setDrillMonth(null); }}
        maxWidth="md"
        title={t('dormantCustomer.m10StatusDialogTitle')}
        showCloseButton
        contentSx={{ p: 1 }}
        // Standar layout drilldown (2026-08-24, instruksi user: "periode
        // jadikan sebagai keterangan jangan judul, pindahkan dari judul") —
        // title cuma nama entitas, subtitle baris pertama = periode (window
        // LIVE, TIDAK digeser).
        //
        // formatPeriodRangeSub (2026-08-25, koreksi KERAS user di M1) —
        // granularitas lebar tampilkan label ("Kuartal 3 Tahun 2026"),
        // bukan rentang tanggal mentah.
        //
        // Prefix label ringkasan status (susulan, sama hari, instruksi user:
        // "lengkapi prefix, jangan hanya aktif/dormant, tapi Pelanggan
        // Aktif/Total Pelanggan agar lebih informatif") — key DEDICATED
        // `m10Summary*` (BUKAN reuse `statusActive`/`statusDormant` dst,
        // yang tetap dipakai apa adanya utk chip status di tabel + dropdown
        // filter Laporan, di situ "Aktif" saja sudah cukup jelas krn ada
        // konteks kolom/label "Status" di sampingnya).
        subtitle={breakdown && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {drillMonth && drillStart && drillEnd ? formatPeriodRangeSub(t, periodType, drillMonth, drillStart, drillEnd) : ''}
            </Typography>
            {/* Label baris (2026-08-26, task029.md §36.48 — instruksi user:
                "ini sudah sesuai kamus v13 belum?") — SEBELUMNYA pakai key
                long-form ("Total Pelanggan Existing", "Pelanggan Existing
                Aktif" dst, peninggalan instruksi rename SEBELUM Kamus v13
                ada). Diganti reuse key *Short milik kartu ringkasan (sudah
                persis istilah Kamus v13: "Existing Total"/"Retained"/
                "Inactive"/"Dormant"/"Reactivated"/"Newly Dormant") — 1
                sumber teks, bukan 2 set kata berbeda utk populasi yang sama.

                Relapsed/Reactivated diberi indent (2026-08-27, task029.md
                §36.53 — pertanyaan user: "bukankah reactivated ini termasuk
                dalam total customer base seharusnya" — user coba jumlahkan
                5 baris flat, hasilnya 72 lebih banyak dari Total Customer
                Base, krn Dormant DI SINI SUDAH gabungan (termasuk Relapsed+
                Reactivated, keputusan §36.47 supaya match kartu KPI) —
                TAPI tampilannya sejajar/flat spt 5 kategori independen,
                jadi wajar dikira harus dijumlah rata. Indent + "↳" menandai
                Relapsed/Reactivated sbg RINCIAN DI DALAM Dormant, bukan
                kategori sejajar tambahan — 4 baris pertama (Total/Active/
                Lapsed/Dormant) tetap mutually exclusive & jumlahnya = Total. */}
            {([
              [t('dormantCustomer.m10SummaryAllShort'), breakdown.rows.length.toLocaleString('id-ID'), false],
              [t('dormantCustomer.m10SummaryActiveShort'), counts.active.toLocaleString('id-ID'), false],
              [t('dormantCustomer.m10SummaryInactiveShort'), counts.inactive.toLocaleString('id-ID'), false],
              // Dormant (2026-08-26, task029.md §36.47 — koreksi KERAS
              // user: "itu dormant jadi 19.200 darimana, dormant di card
              // 19.304") — baris ini HARUS sama persis dgn kartu KPI
              // "Dormant" — bukan dikurangi lagi dgn Newly Dormant/Reaktivasi
              // (yang cuma sub-rincian tambahan DI BAWAHnya, bukan kategori
              // terpisah yang mengurangi angka Dormant utama).
              //
              // +reactivated DIKECUALIKAN saat mode "periode berjalan" (drillStart
              // kosong) DAN cutoff aktif (2026-08-27, §36.56 — koreksi user:
              // "Ya kalau namanya dormant bukan kah harusnya datanya sama?")
              // — di mode itu, `dormant`+`newlyDormant` SUDAH PERSIS = kartu
              // KPI (backend punya cabang tambahan "baru menyebrang dormant
              // DI DALAM periode ini"), menambah `reactivated` di sini malah
              // DOUBLE-COUNT (reactivated by definisi TIDAK dormant sekarang).
              // Mode klik-titik historis (drillStart terisi) TIDAK terpengaruh
              // — backend abaikan cutoff sepenuhnya di mode itu, formula lama
              // (+reactivated) tetap benar.
              [t('dormantCustomer.m10SummaryDormantShort'), (counts.dormant + counts.newlyDormant + (!drillStart && applyDateCutoff ? 0 : counts.reactivated)).toLocaleString('id-ID'), false],
              [t('dormantCustomer.m10SummaryNewlyDormantShort'), counts.newlyDormant.toLocaleString('id-ID'), true],
              [t('dormantCustomer.m10SummaryReactivatedShort'), counts.reactivated.toLocaleString('id-ID'), true],
            ] as [string, string, boolean][]).map(([label, val, indented]) => (
              <Box key={label} sx={{ display: 'flex', gap: 0.5, pl: indented ? 2 : 0 }}>
                {indented && <Typography component="span" variant="caption" sx={{ color: 'text.disabled' }}>↳</Typography>}
                <Typography component="span" variant="caption" color={indented ? 'text.disabled' : 'text.secondary'}>{label}</Typography>
                <Typography component="span" variant="caption" color={indented ? 'text.disabled' : 'text.secondary'}>:</Typography>
                <Typography component="span" variant="caption" sx={{ color: indented ? 'text.secondary' : 'text.primary', fontWeight: indented ? 500 : 600 }}>{val}</Typography>
              </Box>
            ))}
          </Box>
        )}
      >
        <ResponsiveListView
          rows={reactivationRows.map((r) => ({ ...r, id: r.customer_id }))}
          columns={statusColumns}
          loading={breakdownLoading}
          height={400}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          emptyMessage={t('dormantCustomer.m10ReactivationEmpty')}
          mobileFields={['customer_name', 'status', 'reactivation_date']}
        />
      </Dialog>
    </>
  );
}
