import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { useTranslation } from 'react-i18next'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'
import { Card, StatusChip } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { KpiFilterBar } from '@/components/filters/KpiFilterBar'
import { PeriodYoyBanner } from '@/components/analisis/PeriodYoyBanner'
import { KpiMetricCard } from '@/components/analisis/KpiMetricCard'
import { KpiTableToolbar } from '@/components/analisis/KpiTableToolbar'
import { M6RepeatOrder } from '@/components/analisis/M6RepeatOrder'
import { useGlobalFilter } from '@/context/globalFilter.context'
import { useRetentionAnalisis } from '@/hooks/useAnalisis'
import { useCustomerMetrics } from '@/hooks/useMetrics'
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, shiftDateByYears,
} from '@/utils/analisisPeriod'
import { todayIsoDate } from '@/utils/date'
import { TrendChip } from '@/components/analisis/ComparisonMetrics'
import { resolveTrendKind, trendKindColor, averageMonthsInRange, computeChangePct } from '@/utils/analisisComparison'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import type { RetentionRow, RetentionSummary } from '@/types/analisis'

// Halaman ini dimigrasi ke pola KpiFilterBar/KpiSummaryStrip/KpiTableToolbar
// (task025 lanjutan, 2026-08-07) — SEBELUMNYA halaman ini masih pakai
// implementasi lama sendiri (filter 1 baris penuh sesak, PeriodTotalBox 2-kotak,
// PERIOD_TYPES lokal yang masih menyertakan 'ytd' yang sudah dihapus dari
// standar). Migrasi ini menyamakan halaman Retention "apple to apple" dengan
// Revenue — TIDAK ADA perbedaan pola filter/banner/toolbar antar keduanya lagi.

function ParetoBadge() {
  const { t } = useTranslation()
  return (
    <StatusChip
      size="small"
      color="info"
      icon={<WorkspacePremiumIcon />}
      label={t('analisis.paretoBadge')}
    />
  )
}

// ─── Sel angka tunggal (jumlah order) — versi 1-baris dari MetricPair
// (yang dirancang khusus pasangan Rev/GP), dipakai kolom Pembanding/Periode
// Ini/Perubahan Nilai di tabel Retention. ──────────────────────────────────
function OrderCountCell({ text, color }: { text: string; color?: StatusChipColor }) {
  return (
    <Typography variant="body2" sx={{ py: 1, fontWeight: color ? 600 : 400, color: color ? `${color}.main` : undefined }}>
      {text}
    </Typography>
  )
}

export default function RepeatOrder() {
  const { t } = useTranslation()
  const theme = useTheme()

  const scopeFilter = useGlobalFilter()
  const {
    companyId, branchId, division, excludeIntercompany,
    periodType, setPeriodType, endDate, setEndDate,
  } = scopeFilter
  const [search, setSearch] = useState('')
  const [onlyPareto, setOnlyPareto] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })

  const sortBy = sortModel[0]?.field === 'current' ? 'invoice_count' : 'default'
  const sortDir = sortModel[0]?.sort ?? 'desc'

  const todayStr = todayIsoDate()

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate))
  const periodStart = getPeriodDateRange(periodType, periodKey).start
  const currentRange = { start: periodStart, end: endDate }
  // Basis pembanding SELALU YoY (task025 §0a) — rentang literal, BUKAN label
  // "Semester (2) Tahun X" ataupun kata relatif "Lampau/Ini" (sama seperti
  // Analisis/index.tsx, satu sumber kebenaran dgn header kolom tabel).
  const comparisonRange = { start: shiftDateByYears(periodStart, -1), end: shiftDateByYears(endDate, -1) }
  const currentRangeText = formatDateRange(currentRange)
  const comparisonRangeText = formatDateRange(comparisonRange)

  const { data, isLoading } = useRetentionAnalisis({
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
  const rows = (data?.data ?? []).map((row) => ({ ...row, id: row.customer_id }))
  const summary = data?.meta.summary as RetentionSummary | undefined

  // Chart M6 (RadialBar target 80%) — instruksi lanjutan task025 §12:
  // gabungkan chart M6 (sebelumnya di /customer-metrics) ke halaman KPI6
  // ini juga, sama pola dgn M3-di-Revenue. Endpoint `customer-metrics`
  // di-reuse (bukan endpoint baru), `period_end` ikut `endDate` yang sama.
  const { data: customerMetricsData, isLoading: isM6Loading } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: endDate,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  })
  const ror = customerMetricsData?.repeat_order_current
  // Rata-rata bulan yg genuinely masuk rentang periodStart..endDate utk
  // gauge M6 (BUKAN trailing-N-by-posisi-array — bug §8g/KPI4, ditemukan
  // lagi 2026-08-10 via laporan user "reactivation rate di dashboard dan di
  // KPI tidak sama") — supaya dropdown Periode benar-benar mengubah angka
  // (task025 §18) DAN konsisten dgn Dashboard Overview.
  const ror6Value = averageMonthsInRange(customerMetricsData?.trend ?? [], periodStart, endDate, (p) => p.repeat_order_rate)
  // Fetch kedua di tanggal pembanding — utk kartu Repeat Order Rate di
  // bawah (koreksi user 2026-08-10, "section card belum ada").
  const { data: customerMetricsComparisonData } = useCustomerMetrics({
    company_id: companyId,
    branch_id: branchId === 'all' ? undefined : branchId,
    period_end: comparisonRange.end,
    division: division || undefined,
    exclude_intercompany: excludeIntercompany,
  })
  const ror6Comparison = averageMonthsInRange(customerMetricsComparisonData?.trend ?? [], comparisonRange.start, comparisonRange.end, (p) => p.repeat_order_rate)
  const ror6GrowthPct = computeChangePct(ror6Value, ror6Comparison)

  const hasAnyAlert = (row: RetentionRow) => row.comparison.invoice_count_alert

  // Alarm palsu massal (P0) — lihat komentar sama di Analisis/index.tsx.
  const isEmptyPeriod = !!summary && summary.current_invoice_count === 0

  function resolveRowStatus(row: RetentionRow): { label: string; color: StatusChipColor } {
    if (isEmptyPeriod) return { label: t('analisis.noDataLabel'), color: 'default' }
    const kind = resolveTrendKind(row.comparison.invoice_count_change_pct, row.current.invoice_count === 0)
    if (kind === 'none') return { label: t('analisis.noDataLabel'), color: 'default' }
    if (kind === 'stopped') return { label: t('analisis.stoppedLabel'), color: 'error' }
    if (hasAnyAlert(row)) return { label: t('analisis.critical'), color: 'error' }
    return { label: t('analisis.normal'), color: 'success' }
  }

  const orderLabel = t('analisis.metricOrderCount')
  const newBusinessLabel = t('analisis.newBusiness')

  const totalCountText = t('analisis.customerCountText', { count: data?.meta.total ?? 0 })

  const columns: GridColDef<RetentionRow>[] = [
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
      // "Semester (2) Tahun 2025" — itu utk kotak Summary Strip). Lihat
      // Analisis/index.tsx untuk penjelasan lengkap.
      headerName: comparisonRangeText,
      // minWidth+flex (bukan width tetap) — panjang tanggal variatif,
      // sama seperti Analisis/index.tsx.
      minWidth: 190,
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => <OrderCountCell text={`${orderLabel}: ${row.comparison.invoice_count}`} />,
    },
    {
      field: 'current',
      headerName: currentRangeText,
      minWidth: 190,
      flex: 1,
      sortable: true,
      sortingOrder: ['desc', 'asc', null],
      renderCell: ({ row }) => <OrderCountCell text={String(row.current.invoice_count)} />,
    },
    {
      field: 'changeValue',
      headerName: t('analisis.changeValue'),
      minWidth: 160,
      flex: 0.9,
      sortable: false,
      renderCell: ({ row }) => isEmptyPeriod ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>—</Typography>
      ) : (
        <OrderCountCell
          text={row.comparison.invoice_count_change_value > 0 ? `+${row.comparison.invoice_count_change_value}` : String(row.comparison.invoice_count_change_value)}
          color={trendKindColor(resolveTrendKind(row.comparison.invoice_count_change_pct, row.current.invoice_count === 0), row.comparison.invoice_count_alert)}
        />
      ),
    },
    {
      field: 'changePercent',
      headerName: t('analisis.changePercent'),
      // minWidth+flex (bukan width tetap) — sama pola anti-truncation dgn
      // Analisis/index.tsx, chip growth bisa lebih panjang di beberapa state.
      minWidth: 140,
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => isEmptyPeriod ? (
        <Typography variant="body2" color="text.disabled">—</Typography>
      ) : (
        <TrendChip
          label={orderLabel}
          pct={row.comparison.invoice_count_change_pct}
          alert={row.comparison.invoice_count_alert}
          newBusinessLabel={newBusinessLabel}
          currentIsZero={row.current.invoice_count === 0}
          hideLabel
        />
      ),
    },
    {
      field: '_status',
      headerName: t('common.status'),
      // minWidth+flex (bukan width tetap 110) — "Belum ada data" jauh lebih
      // panjang dari "Aman", sama pola dgn Analisis/index.tsx.
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
        <Typography variant="pageTitle">{t('analisis.retentionTitle')}</Typography>
        <Typography variant="pageSubtitle">{t('analisis.retentionSubtitle')}</Typography>
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
            KPI (2026-08-10), menggantikan KpiSummaryStrip. ── */}
        {summary && (
          <PeriodYoyBanner
            currentRangeText={currentRangeText}
            comparisonRangeText={comparisonRangeText}
            metrics={[{
              baselineValueText: String(summary.comparison_invoice_count),
              deltaValueText: String(Math.abs(summary.change_value)),
              growthPct: isEmptyPeriod ? null : summary.change_pct,
            }]}
          />
        )}

        {isEmptyPeriod && (
          <Alert severity="info">
            {t('analisis.emptyPeriodBanner', { range: currentRangeText })}
          </Alert>
        )}

        {/* ── 2 kartu — Jumlah Order & Repeat Order Rate (koreksi user
            2026-08-10, "section card belum ada"). ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <KpiMetricCard
              label={orderLabel}
              accentColor={theme.custom.data[0]}
              value={String(summary?.current_invoice_count ?? 0)}
              growthPct={isEmptyPeriod ? null : (summary?.change_pct ?? null)}
              deltaValueText={String(Math.abs(summary?.change_value ?? 0))}
              comparisonValueText={String(summary?.comparison_invoice_count ?? 0)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <KpiMetricCard
              label={t('customerMetrics.m6.seriesRate')}
              badgeLabel={t('common.radialTargetLabel', { threshold: ror?.target_pct ?? 80 })}
              accentColor={theme.custom.data[1]}
              value={`${ror6Value.toFixed(2)}%`}
              growthPct={ror6GrowthPct}
              deltaValueText={`${Math.abs(ror6Value - ror6Comparison).toFixed(2)}%`}
              comparisonValueText={`${ror6Comparison.toFixed(2)}%`}
            />
          </Grid>
        </Grid>

        {/* ── M6 · RadialBar target 80% (task025 §12, 2026-08-07) ── */}
        <M6RepeatOrder
          isLoading={isM6Loading}
          value={ror6Value}
          thresholdPct={ror?.target_pct ?? 80}
          companyId={companyId}
          branchId={branchId === 'all' ? undefined : branchId}
          division={division || undefined}
          periodEnd={endDate}
          excludeIntercompany={excludeIntercompany}
          trend={customerMetricsData?.trend}
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
