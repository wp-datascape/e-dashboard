import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import SearchIcon from '@mui/icons-material/Search'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { useTranslation } from 'react-i18next'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { Card, StatusChip, DatePicker } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { useRetentionAnalisis } from '@/hooks/useAnalisis'
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, formatPeriodLabel, shiftDateByYears, shiftEndDate,
} from '@/utils/analisisPeriod'
import { TrendChip } from '@/components/analisis/ComparisonMetrics'
import { SummaryBar } from '@/components/analisis/SummaryBar'
import { trendColor } from '@/utils/analisisComparison'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import type { AnalisisPeriodType, RetentionRow, RetentionSummary } from '@/types/analisis'

// Urutan terpendek -> terpanjang, mirror halaman Analisis Revenue.
const PERIOD_TYPES: AnalisisPeriodType[] = ['monthly', 'quarter', 'semester', 'ytd', 'annual']

function todayISODate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

export default function AnalisisRetentionPage() {
  const { t } = useTranslation()

  const scopeFilter = useScopedCompanyFilter()
  const { companyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter

  const [periodType, setPeriodType] = useState<AnalisisPeriodType>('quarter')
  const [endDate, setEndDate] = useState<string>(todayISODate())
  const [search, setSearch] = useState('')
  const [onlyPareto, setOnlyPareto] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })

  const sortBy = sortModel[0]?.field === 'current' ? 'invoice_count' : 'default'
  const sortDir = sortModel[0]?.sort ?? 'desc'

  const todayStr = todayISODate()
  const isViewingInProgress = endDate === todayStr

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate))
  const periodStart = getPeriodDateRange(periodType, periodKey).start
  const currentRange = { start: periodStart, end: endDate }
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

  const hasAnyAlert = (row: RetentionRow) => row.comparison.invoice_count_alert

  const orderLabel = t('analisis.metricOrderCount')
  const newBusinessLabel = t('analisis.newBusiness')

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
      headerName: t('analisis.comparisonLabel'),
      width: 140,
      sortable: false,
      renderCell: ({ row }) => <OrderCountCell text={`${orderLabel}: ${row.comparison.invoice_count}`} />,
    },
    {
      field: 'current',
      headerName: t('analisis.periodLabel'),
      width: 140,
      sortable: true,
      sortingOrder: ['desc', 'asc', null],
      renderCell: ({ row }) => <OrderCountCell text={String(row.current.invoice_count)} />,
    },
    {
      field: 'changeValue',
      headerName: t('analisis.changeValue'),
      width: 140,
      sortable: false,
      renderCell: ({ row }) => (
        <OrderCountCell
          text={row.comparison.invoice_count_change_value > 0 ? `+${row.comparison.invoice_count_change_value}` : String(row.comparison.invoice_count_change_value)}
          color={trendColor(row.comparison.invoice_count_change_pct, row.comparison.invoice_count_alert)}
        />
      ),
    },
    {
      field: 'changePercent',
      headerName: t('analisis.changePercent'),
      width: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <TrendChip
          label={orderLabel}
          pct={row.comparison.invoice_count_change_pct}
          alert={row.comparison.invoice_count_alert}
          newBusinessLabel={newBusinessLabel}
        />
      ),
    },
    {
      field: '_status',
      headerName: t('common.status'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        hasAnyAlert(row)
          ? <StatusChip label={t('analisis.critical')} color="error" />
          : <StatusChip label={t('analisis.normal')} color="success" />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="pageTitle">{t('analisis.retentionTitle')}</Typography>
        <Typography variant="pageSubtitle">{t('analisis.retentionSubtitle')}</Typography>
      </Box>

      <Card sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
          <ScopeFilterFields filter={scopeFilter} sx={{ flex: { sm: '1 1 160px' } }} />

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 }, flex: { sm: '1 1 160px' } }}>
            <InputLabel>{t('analisis.periodLabel')}</InputLabel>
            <Select
              value={periodType}
              label={t('analisis.periodLabel')}
              onChange={(e) => setPeriodType(e.target.value as AnalisisPeriodType)}
            >
              {PERIOD_TYPES.map((p) => (
                <MenuItem key={p} value={p}>{t(`paretoThreshold.period.${p}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            size="small"
            label={t('analisis.periodDataLabel')}
            value={endDate}
            onChange={(e) => {
              const picked = e.target.value
              setEndDate(picked && picked > todayStr ? todayStr : picked)
              setPaginationModel((p) => ({ ...p, page: 0 }))
            }}
            sx={{ minWidth: { xs: '100%', sm: 170 }, flex: { sm: '1 1 170px' } }}
          />

          <TextField
            size="small"
            placeholder={t('analisis.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPaginationModel((p) => ({ ...p, page: 0 }))
            }}
            sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { sm: '1 1 220px' } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={onlyPareto}
                onChange={(e) => {
                  setOnlyPareto(e.target.checked)
                  setPaginationModel((p) => ({ ...p, page: 0 }))
                }}
                size="small"
              />
            }
            label={t('analisis.onlyPareto')}
            sx={{ ml: 0, whiteSpace: 'nowrap' }}
          />

          <ExcludeIntercompanyToggle
            checked={excludeIntercompany}
            onChange={(checked) => {
              setExcludeIntercompany(checked)
              setPaginationModel((p) => ({ ...p, page: 0 }))
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, mt: 2.5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <IconButton size="small" sx={{ flexShrink: 0 }} onClick={() => setEndDate(shiftEndDate(periodType, endDate, -1))}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Stack spacing={0.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap sx={{ maxWidth: '100%' }}>
              {formatPeriodLabel(periodType, periodKey)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' }, maxWidth: '100%' }}
            >
              {t('analisis.comparisonLabel')}: {comparisonRangeText} • {t('analisis.periodLabel')}: {currentRangeText}
            </Typography>
            {isViewingInProgress && (
              <StatusChip size="small" color="warning" label={t('analisis.inProgress')} />
            )}
          </Stack>
          <IconButton
            sx={{ flexShrink: 0 }}
            size="small"
            disabled={isViewingInProgress}
            onClick={() => {
              const next = shiftEndDate(periodType, endDate, 1)
              setEndDate(next > todayStr ? todayStr : next)
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Card>

      {summary && (
        <SummaryBar
          comparisonLabel={t('analisis.comparisonLabel')}
          periodLabel={t('analisis.periodLabel')}
          changeValueLabel={t('analisis.changeValue')}
          changePercentLabel={t('analisis.changePercent')}
          comparisonContent={<OrderCountCell text={`${orderLabel}: ${summary.comparison_invoice_count}`} />}
          periodContent={<OrderCountCell text={String(summary.current_invoice_count)} />}
          changeValueContent={
            <OrderCountCell
              text={summary.change_value > 0 ? `+${summary.change_value}` : String(summary.change_value)}
              color={trendColor(summary.change_pct, false)}
            />
          }
          changePercentContent={
            <TrendChip label={orderLabel} pct={summary.change_pct} alert={false} newBusinessLabel={newBusinessLabel} />
          }
        />
      )}

      <Card>
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
