import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import MuiTooltip from '@mui/material/Tooltip'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { Card, StatusChip } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { KpiFilterBar } from '@/components/filters/KpiFilterBar'
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner'
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard'
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar'
import { M3Revenue } from '@/components/analisis/M3Revenue'
import { useGlobalFilter } from '@/context/globalFilter.context'
import { useAnalisis } from '@/hooks/useAnalisis'
import { useCustomerMetrics } from '@/hooks/useMetrics'
import { formatIDR, formatIDRSigned } from '@/utils/format'
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
  KPI_PERIOD_TYPES, type KpiPeriodType,
} from '@/utils/analisisPeriod'
import { todayIsoDate } from '@/utils/date'
import { MetricPair, MetricPercentPair } from '@/components/analisis/ComparisonMetrics'
import { resolveTrendKind, trendKindColor, resolveRowStatusKind, rowStatusColor, averageMonthsInRange, computeChangePct } from '@/utils/analisisComparison'
import type { AnalisisRow, AnalisisSummary } from '@/types/analisis'
import type { StatusChipColor } from '@/components/ui/StatusChip'

// ─── Badge Pareto — mirror pola "highMarginBadge" di Product Ledger: chip kecil
// di sebelah nama, customer yang di-flag tetap tampil dalam list lengkap ──────
// Tooltip ditambahkan (critique 2026-08-18, P2) — istilah "Pareto" tidak
// otomatis dipahami semua user eksekutif, pola InfoOutlinedIcon+tooltip
// sudah ada di M3Revenue tapi tidak diterapkan merata ke badge ini.
function ParetoBadge() {
  const { t } = useTranslation()
  return (
    <MuiTooltip title={t('analisis.paretoBadgeTooltip')} placement="top" arrow>
      <StatusChip
        size="small"
        color="info"
        icon={<WorkspacePremiumIcon />}
        label={t('analisis.paretoBadge')}
      />
    </MuiTooltip>
  )
}

export default function CustomerRevenue() {
  const { t } = useTranslation()
  const theme = useTheme()

  // Baca filter awal dari query string (SEKALI, saat mount) — dipakai tombol
  // "Lihat di Analisis" di popup detail notifikasi biar halaman ini kebuka
  // dengan data yang PERSIS sama dengan yang disebut di pesan notifikasi
  // (company/periode/search), bukan halaman generik kosong. Kalau deep-link
  // bawa period_key (histori dari notifikasi lama), endDate awal dihitung dari
  // akhir NATURAL periode itu — bukan hari ini.
  const [searchParams] = useSearchParams()

  // Filter Cabang & Divisi (task016 §27) — SSOT yang sama dipakai Customers/
  // Products/Transactions dkk (docs-v2/task/task001.md Task H), bukan implementasi
  // scope-aware terpisah lagi. Opsi branch/division SUDAH difilter sesuai hak
  // akses user (lihat useScopedCompanyFilter), jadi tidak perlu enforcement
  // tambahan di sisi frontend. periodType/endDate SEKARANG JUGA dari context
  // global (task026 Fase 2) — dulu state lokal halaman ini
  // ("Tanggal" = filter tunggal pengganti period_key+Pembanding, task016 §26,
  // revisi 2026-08-01: user pilih TANGGAL PERSIS, start range selalu awal
  // periode yang mengandung tanggal itu, end selalu tanggal itu sendiri;
  // pembanding SELALU YoY, digeser -1 tahun — lihat currentRange/comparisonRange
  // di bawah, MIRROR 1-ke-1 logic backend analisis.service.ts).
  const scopeFilter = useGlobalFilter()
  const {
    companyId, setCompanyId, branchId, division, excludeIntercompany,
    periodType, setPeriodType, endDate, setEndDate,
  } = scopeFilter

  // Deep-link dari popup notifikasi (SEKALI saat mount) — company_id/periodType/
  // endDate SEKARANG state GLOBAL (task026 Fase 2), tidak bisa lagi
  // diinisialisasi lewat useState(lazy initializer) seperti sebelumnya, jadi
  // diterapkan via effect one-time (hindari setState sinkron REAKTIF di
  // effect, tapi inisialisasi sekali dari URL saat mount beda kasus — tidak
  // ada dependency lain yang bisa berubah lagi setelah ini). URL TIDAK bawa
  // param tertentu -> filter global TIDAK disentuh (persist dari navigasi
  // sebelumnya, bukan direset paksa ke default). Validasi period_type
  // terhadap KPI_PERIOD_TYPES (4 pilihan standar, task025 §0a) — deep-link
  // lama yang bawa period_type=ytd otomatis fallback ke 'quarter' (ytd
  // terverifikasi redundant dgn annual, lihat komentar di utils/analisisPeriod.ts).
  useEffect(() => {
    const v = searchParams.get('company_id')
    if (v) setCompanyId(Number(v))

    const urlPeriodType = searchParams.get('period_type')
    const resolvedPeriodType: KpiPeriodType | null = urlPeriodType
      ? ((KPI_PERIOD_TYPES as string[]).includes(urlPeriodType) ? (urlPeriodType as KpiPeriodType) : 'quarter')
      : null
    if (resolvedPeriodType) setPeriodType(resolvedPeriodType)

    const explicitEndDate = searchParams.get('end_date')
    if (explicitEndDate) {
      setEndDate(explicitEndDate)
    } else {
      const deepLinkPeriodKey = searchParams.get('period_key')
      if (deepLinkPeriodKey) {
        try {
          setEndDate(getPeriodDateRange(resolvedPeriodType ?? periodType, deepLinkPeriodKey).end)
        } catch {
          // period_key tidak valid utk periodType ini — abaikan.
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [onlyPareto, setOnlyPareto] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })

  // Kolom 'current' (Periode Ini) satu-satunya yang sortable — sort by revenue.
  // Selain itu 'default' = prioritas Pareto duluan lalu nama alfabetis (task016 §12).
  const sortBy = sortModel[0]?.field === 'current' ? 'revenue' : 'default'
  const sortDir = sortModel[0]?.sort ?? 'desc'

  const todayStr = todayIsoDate()

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate))
  const periodStart = getPeriodDateRange(periodType, periodKey).start
  const currentRange = { start: periodStart, end: endDate }
  const comparisonRange = { start: shiftDateByYears(periodStart, -1), end: shiftDateByYears(endDate, -1) }
  // Rentang tanggal LITERAL (bukan label "Semester (2) Tahun X" ataupun kata
  // relatif "Lampau/Ini") — dipakai di header kolom tabel DAN kotak
  // KpiSummaryStrip, basis pembanding SELALU YoY (task025 §0a).
  const currentRangeText = formatDateRange(currentRange)
  const comparisonRangeText = formatDateRange(comparisonRange)

  const { data, isLoading } = useAnalisis({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    division: division || undefined,
    period_type: periodType,
    end_date: endDate,
    search: search || undefined,
    only_pareto: onlyPareto,
    exclude_intercompany: excludeIntercompany,
    sort_by: sortBy,
    sort_dir: sortDir,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
  })

  // Tren revenue 12 bulan (M3) — instruksi lanjutan task025 2026-08-07:
  // tampilkan di halaman menu Revenue ini juga (bawah filter, atas
  // KpiSummaryStrip), bukan cuma di CustomerMetrics. Endpoint `customer-metrics`
  // di-reuse (bukan endpoint baru) — trend-nya SELALU 12 bulan rolling, TIDAK
  // ikut `periodType`/`endDate` KpiFilterBar (beda konsep: trend historis vs
  // titik pembanding YoY), tapi tetap ikut scope (company/branch/division/
  // exclude-intercompany) yang sama dgn tabel di bawahnya, dan `period_end`
  // pakai `endDate` yang sama supaya window 12 bulannya konsisten dgn "per
  // tanggal" yang sedang dipilih user.
  const { data: customerMetricsData, isLoading: isM3Loading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: endDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  })
  const m3Trend = customerMetricsData?.trend ?? []
  // Fetch kedua di tanggal pembanding (setahun lalu) — dibutuhkan utk 2 kartu
  // Avg/Median Revenue di bawah (koreksi user 2026-08-10, "section card
  // belum ada"), pola sama dgn dual-fetch di halaman KPI lain.
  const { data: customerMetricsComparisonData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: comparisonRange.end,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  })
  const avgRevenueCurrent = averageMonthsInRange(m3Trend, periodStart, endDate, (p) => p.avg_revenue)
  const avgRevenueComparison = averageMonthsInRange(customerMetricsComparisonData?.trend ?? [], comparisonRange.start, comparisonRange.end, (p) => p.avg_revenue)
  const avgRevenueGrowthPct = computeChangePct(avgRevenueCurrent, avgRevenueComparison)
  const medianRevenueCurrent = averageMonthsInRange(m3Trend, periodStart, endDate, (p) => p.median_revenue)
  const medianRevenueComparison = averageMonthsInRange(customerMetricsComparisonData?.trend ?? [], comparisonRange.start, comparisonRange.end, (p) => p.median_revenue)
  const medianRevenueGrowthPct = computeChangePct(medianRevenueCurrent, medianRevenueComparison)

  // DataGrid butuh field `id` unik per baris
  const rows = (data?.data ?? []).map((row) => ({ ...row, id: row.customer_id }))
  // Total SELURUH customer yang lolos filter (bukan cuma halaman ini) —
  // backend hitung terpisah dari data per-baris, lihat meta.summary.
  const summary = data?.meta.summary as AnalisisSummary | undefined

  const hasAnyAlert = (row: AnalisisRow) =>
    row.comparison.revenue_alert || row.comparison.margin_alert

  // Alarm palsu massal (P0, audit UX 2026-08-07, screenshot 952 baris "-100%"
  // merah): kalau TOTAL seluruh set terfilter di periode ini 0 (bukan cuma 1
  // customer), ini nyaris pasti data belum masuk (lag import), BUKAN seluruh
  // customer benar-benar berhenti bertransaksi bersamaan. Beda dari kasus
  // "Berhenti" per-baris (1 customer nol, yang lain normal) yang TETAP valid
  // sebagai sinyal — di sini override total jadi netral.
  const isEmptyPeriod = !!summary && summary.current.revenue === 0 && summary.current.margin === 0

  // Status set lengkap (task025, feedback user 2026-08-07): Aman/Perhatian/
  // Baru/Berhenti/Datar/Belum ada data — sebelumnya cuma binary Aman/Perlu
  // Perhatian, baris "pelanggan baru" (old=0) salah kena "Aman" karena tidak
  // ada cabang khusus. Pakai resolveRowStatusKind terpusat (reusable utk
  // halaman KPI lain, termasuk yang metriknya inverse-polarity).
  function resolveRowStatus(row: AnalisisRow): { label: string; color: StatusChipColor } {
    if (isEmptyPeriod) return { label: t('analisis.noDataLabel'), color: 'default' }
    const revKind = resolveTrendKind(row.comparison.revenue_change_pct, row.current.revenue === 0)
    const gpKind = resolveTrendKind(row.comparison.margin_change_pct, row.current.margin === 0)
    const statusKind = resolveRowStatusKind([revKind, gpKind], hasAnyAlert(row))
    const labelKey = {
      critical: 'analisis.critical', normal: 'analisis.normal', new: 'analisis.newBusiness',
      stopped: 'analisis.stoppedLabel', flat: 'analisis.flatLabel', none: 'analisis.noDataLabel',
    }[statusKind]
    return { label: t(labelKey), color: rowStatusColor(statusKind) }
  }

  const revLabel = t('analisis.metricRevenue')
  const gmLabel = t('analisis.metricMargin') // dipakai KHUSUS nilai persentase (rasio)
  const gpLabel = t('analisis.metricGP') // dipakai KHUSUS nilai Rupiah (angka absolut)
  const newBusinessLabel = t('analisis.newBusiness')

  // Data pertumbuhan utk kartu 3 KpiSummaryStrip — 1 entri per metrik
  const totalCountText = t('analisis.customerCountText', { count: data?.meta.total ?? 0 })

  const columns: GridColDef<AnalisisRow>[] = [
    {
      field: 'company_name',
      headerName: t('analisis.company'),
      width: 190,
      sortable: false,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary" noWrap title={row.company_name ?? undefined}>
          {row.company_name ?? '-'}
        </Typography>
      ),
    },
    {
      field: 'customer_name',
      headerName: t('analisis.customer'),
      flex: 1.5,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2">{row.customer_name}</Typography>
            {row.is_pareto && <ParetoBadge />}
          </Stack>
          {row.customer_code && (
            <Typography variant="caption" color="text.secondary">{row.customer_code}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'periode_lampau',
      // Tanggal nyata (bukan "Pembanding" generik, bukan juga label periode
      // "Semester (2) Tahun 2025" — itu utk kotak Summary Strip). Header ini
      // reuse comparisonRangeText yang SUDAH tampil di caption tengah, supaya
      // user tidak perlu menebak kolom mana yang lebih dulu (feedback audit
      // UX 2026-08-07, screenshot header oranye).
      headerName: comparisonRangeText,
      // width lebih lebar dari sebelumnya (170) — panjang tanggal variatif
      // ("1–31 Juli 2025" vs "1 Jan – 31 Mar 2026"), jangan kepotong (task023 §5b).
      minWidth: 190,
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => (
        <MetricPair revenueLabel={revLabel} marginLabel={gpLabel} revenueText={formatIDR(row.comparison.revenue)} marginText={formatIDR(row.comparison.margin)} />
      ),
    },
    {
      field: 'current',
      headerName: currentRangeText,
      minWidth: 190,
      flex: 1,
      sortable: true,
      // Klik pertama langsung descending (besar ke kecil) — default MUI DataGrid
      // asc dulu bikin customer revenue 0 numpuk di atas, kelihatan salah arah.
      sortingOrder: ['desc', 'asc', null],
      // showLabels TIDAK di-set false lagi (default true) — gaya label
      // disamakan dgn kolom Pembanding (feedback user 2026-08-07: "kini 2025
      // berlabel Pendapatan:/Laba Kotor:, 2026 tidak" — sekarang konsisten).
      renderCell: ({ row }) => (
        <MetricPair revenueLabel={revLabel} marginLabel={gpLabel} revenueText={formatIDR(row.current.revenue)} marginText={formatIDR(row.current.margin)} />
      ),
    },
    {
      field: 'changeValue',
      headerName: t('analisis.changeValue'),
      width: 170,
      sortable: false,
      // isEmptyPeriod: selisih ditampilkan "—" (bukan angka -100%/Berhenti per
      // baris) — seluruh set kosong itu 1 sinyal sistemik, bukan 952 sinyal
      // individual (P0, audit UX 2026-08-07).
      renderCell: ({ row }) => isEmptyPeriod ? (
        <Typography variant="body2" color="text.disabled">—</Typography>
      ) : (
        <MetricPair
          revenueLabel={revLabel}
          marginLabel={gpLabel}
          revenueText={formatIDRSigned(row.comparison.revenue_change_value)}
          marginText={formatIDRSigned(row.comparison.margin_change_value)}
          revenueColor={trendKindColor(resolveTrendKind(row.comparison.revenue_change_pct, row.current.revenue === 0), row.comparison.revenue_alert)}
          marginColor={trendKindColor(resolveTrendKind(row.comparison.margin_change_pct, row.current.margin === 0), row.comparison.margin_alert)}
          showLabels={false}
        />
      ),
    },
    {
      field: 'changePercent',
      headerName: t('analisis.changePercent'),
      width: 160,
      sortable: false,
      renderCell: ({ row }) => isEmptyPeriod ? (
        <Typography variant="body2" color="text.disabled">—</Typography>
      ) : (
        <MetricPercentPair
          revenueLabel={revLabel}
          marginLabel={gmLabel}
          revenuePct={row.comparison.revenue_change_pct}
          marginPct={row.comparison.margin_change_pct}
          revenueAlert={row.comparison.revenue_alert}
          marginAlert={row.comparison.margin_alert}
          newBusinessLabel={newBusinessLabel}
          revenueCurrentIsZero={row.current.revenue === 0}
          marginCurrentIsZero={row.current.margin === 0}
          // hideLabel — chip cukup "▲ 64.3%" (bukan "▲ Pendapatan: 64.3%"),
          // urutan stack (atas=Pendapatan, bawah=Laba) sudah cukup menyatakan
          // metrik mana. Feedback user 2026-08-07: chip kepanjangan/kepotong.
          hideLabel
        />
      ),
    },
    {
      field: '_status',
      headerName: t('common.status'),
      // minWidth+flex (bukan width tetap 110) — "Belum ada data" jauh lebih
      // panjang dari "Aman"/"Baru", akan kepotong di 110px (task023 §5b,
      // kasus sama, feedback user 2026-08-07 acceptance: "tidak ada chip
      // terpotong").
      minWidth: 140,
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => {
        const status = resolveRowStatus(row)
        return <StatusChip label={status.label} color={status.color} />
      },
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="pageTitle">{t('analisis.title')}</Typography>
        <Typography variant="pageSubtitle">{t('analisis.subtitle')}</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <KpiFilterBar
          filter={scopeFilter}
          periodType={periodType}
          onPeriodTypeChange={(v) => {
            setPeriodType(v)
            setPaginationModel((p) => ({ ...p, page: 0 }))
          }}
          endDate={endDate}
          onEndDateChange={(v) => {
            setEndDate(v)
            setPaginationModel((p) => ({ ...p, page: 0 }))
          }}
          onResetExtra={() => {
            setPeriodType('quarter')
            setEndDate(todayStr)
            setSearch('')
            setOnlyPareto(false)
            setPaginationModel((p) => ({ ...p, page: 0 }))
          }}
        />

        {/* ── Banner "Detail Periode & Pembanding YoY" — standar 10 halaman
            KPI (2026-08-10), menggantikan KpiSummaryStrip. 2 metrik
            sekaligus (Revenue & Laba Kotor). ── */}
        {summary && (
          <PeriodYoyBanner
            currentRangeText={currentRangeText}
            comparisonRangeText={comparisonRangeText}
            metrics={[
              {
                label: revLabel,
                baselineValueText: formatIDR(summary.comparison.revenue),
                deltaValueText: formatIDR(Math.abs(summary.revenue_change_value)),
                growthPct: isEmptyPeriod ? null : summary.revenue_change_pct,
              },
              {
                label: gpLabel,
                baselineValueText: formatIDR(summary.comparison.margin),
                deltaValueText: formatIDR(Math.abs(summary.margin_change_value)),
                growthPct: isEmptyPeriod ? null : summary.margin_change_pct,
              },
            ]}
          />
        )}

        {isEmptyPeriod && (
          <Alert severity="info">
            {t('analisis.emptyPeriodBanner', { range: currentRangeText })}
          </Alert>
        )}

        {/* ── 2 kartu — Avg/Median Revenue per existing customer (koreksi
            user 2026-08-10, "section card belum ada"). accentColor = data[1]/
            data[2] (BUKAN data[0]/data[1] lagi, critique 2026-08-18 P1) —
            disamakan persis dengan warna garis Avg/Median di M3Revenue di
            bawah, supaya metrik yang sama tidak berganti warna antar-widget
            yang berdekatan (pelanggaran "recognition rather than recall"). ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <KpiMetricCard
              label={t('analisis.metricAvgRevenue')}
              accentColor={theme.custom.data[1]}
              value={formatIDR(avgRevenueCurrent)}
              growthPct={avgRevenueGrowthPct}
              deltaValueText={formatIDR(Math.abs(avgRevenueCurrent - avgRevenueComparison))}
              comparisonValueText={formatIDR(avgRevenueComparison)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <KpiMetricCard
              label={t('analisis.metricMedianRevenue')}
              accentColor={theme.custom.data[2]}
              value={formatIDR(medianRevenueCurrent)}
              growthPct={medianRevenueGrowthPct}
              deltaValueText={formatIDR(Math.abs(medianRevenueCurrent - medianRevenueComparison))}
              comparisonValueText={formatIDR(medianRevenueComparison)}
            />
          </Grid>
        </Grid>

        {/* Chart breakdown Avg vs Median (BarChartWidget 1-kategori) DIHAPUS
            (critique 2026-08-18, P0) — cuma menggambar ulang angka yang
            sudah tampil besar di 2 KpiMetricCard persis di atas, tidak
            menambah informasi (kode lama sendiri mengakui ini "adaptasi"
            paksa dari referensi yang metriknya beda). M3Revenue (tren
            12-bulan + drill-down) satu-satunya chart yang tersisa di sini,
            sekarang full-width karena memang tidak ada lagi pasangannya. */}
        <M3Revenue
          trend={m3Trend}
          isLoading={isM3Loading}
          companyId={companyId}
          branchId={branchId === 'all' ? undefined : branchId}
          division={division || undefined}
          excludeIntercompany={excludeIntercompany}
        />
      </Box>

      <Card>
        <KpiTableToolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPaginationModel((p) => ({ ...p, page: 0 }))
          }}
          searchPlaceholder={t('analisis.searchPlaceholder')}
          onlyPriority={onlyPareto}
          onOnlyPriorityChange={(v) => {
            setOnlyPareto(v)
            setPaginationModel((p) => ({ ...p, page: 0 }))
          }}
          onlyPriorityLabel={t('analisis.onlyPareto')}
          totalCountText={totalCountText}
        />
        <ResponsiveListView
          rows={rows}
          columns={columns}
          mobileFields={['customer_name', 'company_name', 'periode_lampau', 'current', 'changeValue', 'changePercent', '_status']}
          loading={isLoading}
          getRowHeight="auto"
          rowCount={data?.meta.total ?? 0}
          paginationMode="server"
          sortingMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={(model) => {
            setSortModel(model)
            setPaginationModel((p) => ({ ...p, page: 0 }))
          }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Card>
    </Box>
  )
}
