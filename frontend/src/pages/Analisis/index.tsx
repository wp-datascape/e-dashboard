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
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import RemoveIcon from '@mui/icons-material/Remove'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { useTranslation } from 'react-i18next'
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { Card, StatusChip } from '@/components/ui'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { useCompanies } from '@/hooks/useCompanies'
import { useAnalisis } from '@/hooks/useAnalisis'
import { formatIDR } from '@/utils/format'
import { getCurrentPeriodKey, getLatestClosedPeriodKey, getPreviousPeriodKey, getNextPeriodKey, formatPeriodLabel } from '@/utils/analisisPeriod'
import type { ParetoPeriodType } from '@/types/paretoThresholds'
import type { AnalisisComparisonMode, AnalisisRow, AnalisisMetricComparison } from '@/types/analisis'

const PERIOD_TYPES: ParetoPeriodType[] = ['quarter', 'semester', 'annual']
const COMPARISON_MODES: AnalisisComparisonMode[] = ['qoq', 'yoy', 'both']

// ─── Badge naik/turun — hijau naik, kuning turun tapi belum lewat threshold,
// merah turun DAN sudah lewat threshold ─────────────────────────────────────
function TrendBadge({ label, pct, alert }: { label: string; pct: number | null; alert: boolean }) {
  // Tidak ada baseline (previous period 0 — customer baru/belum ada transaksi,
  // task016 §9) — tampilkan "0%" TAPI netral abu-abu, BUKAN hijau/naik atau
  // merah/turun. Ini bukan klaim "tidak ada perubahan", cuma memang tidak ada
  // data pembanding sama sekali.
  if (pct === null) {
    return <StatusChip size="small" label={`${label}: 0%`} icon={<RemoveIcon />} color="default" />
  }

  const isDown = pct < 0
  const color: StatusChipColor = !isDown ? 'success' : (alert ? 'error' : 'warning')
  const icon = isDown ? <TrendingDownIcon /> : <TrendingUpIcon />

  return (
    <StatusChip
      size="small"
      color={color}
      icon={icon}
      label={`${label}: ${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
    />
  )
}

function ChangeCell({ comparison }: { comparison: AnalisisMetricComparison | null }) {
  const { t } = useTranslation()
  if (!comparison) return <Typography variant="body2" color="text.secondary">-</Typography>

  return (
    <Stack spacing={0.75} sx={{ py: 1 }}>
      <TrendBadge label={t('analisis.metricRevenue')} pct={comparison.revenue_change_pct} alert={comparison.revenue_alert} />
      <TrendBadge label={t('analisis.metricMargin')} pct={comparison.margin_change_pct} alert={comparison.margin_alert} />
    </Stack>
  )
}

// ─── Badge Pareto — mirror pola "highMarginBadge" di Product Ledger: chip kecil
// di sebelah nama, customer yang di-flag tetap tampil dalam list lengkap ──────
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

export default function AnalisisPage() {
  const { t } = useTranslation()
  const { data: companies = [] } = useCompanies()

  const [companyId, setCompanyId] = useState<number | 'all'>('all')
  const [periodType, setPeriodType] = useState<ParetoPeriodType>('quarter')
  const [periodKey, setPeriodKey] = useState<string>(() => getLatestClosedPeriodKey('quarter'))
  const [comparison, setComparison] = useState<AnalisisComparisonMode>('both')
  const [search, setSearch] = useState('')
  const [onlyPareto, setOnlyPareto] = useState(false)
  const [excludeIntercompany, setExcludeIntercompany] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })

  // Kolom 'current' (Periode Ini) satu-satunya yang sortable — sort by revenue.
  // Selain itu 'default' = prioritas Pareto duluan lalu nama alfabetis (task016 §12).
  const sortBy = sortModel[0]?.field === 'current' ? 'revenue' : 'default'
  const sortDir = sortModel[0]?.sort ?? 'desc'

  const handlePeriodTypeChange = (nextType: ParetoPeriodType) => {
    setPeriodType(nextType)
    setPeriodKey(getLatestClosedPeriodKey(nextType))
  }

  const currentInProgressKey = getCurrentPeriodKey(periodType)
  const isViewingInProgress = periodKey === currentInProgressKey
  const periodTypeLabel = t(`paretoThreshold.period.${periodType}`)

  const { data, isLoading } = useAnalisis({
    company_id: companyId,
    period_type: periodType,
    period_key: periodKey,
    comparison,
    search: search || undefined,
    only_pareto: onlyPareto,
    exclude_intercompany: excludeIntercompany,
    sort_by: sortBy,
    sort_dir: sortDir,
    page: paginationModel.page + 1,
    per_page: paginationModel.pageSize,
  })
  // DataGrid butuh field `id` unik per baris
  const rows = (data?.data ?? []).map((row) => ({ ...row, id: row.customer_id }))

  const hasAnyAlert = (row: AnalisisRow) =>
    row.previous?.revenue_alert || row.previous?.margin_alert || row.yoy?.revenue_alert || row.yoy?.margin_alert

  const renderReportCard = (rawRow: Record<string, unknown>) => {
    const row = rawRow as unknown as AnalisisRow
    const alert = hasAnyAlert(row)
    return (
      <Card key={row.customer_id} sx={{ mb: 2, p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{row.customer_name}</Typography>
                {row.is_pareto && <ParetoBadge />}
              </Stack>
              <Typography variant="caption" color="text.secondary" noWrap>{row.company_name ?? '-'}</Typography>
            </Box>
            <StatusChip
              label={alert ? t('analisis.alert') : t('analisis.normal')}
              color={alert ? 'error' : 'success'}
            />
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('analisis.current')}
            </Typography>
            <Typography variant="body2">{formatIDR(row.current.revenue)}</Typography>
            <Typography variant="caption" color="text.secondary">GP {formatIDR(row.current.margin)}</Typography>
          </Box>

          {row.previous && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('analisis.vsPrevious')}
              </Typography>
              <ChangeCell comparison={row.previous} />
            </Box>
          )}

          {row.yoy && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('analisis.vsYoy')}
              </Typography>
              <ChangeCell comparison={row.yoy} />
            </Box>
          )}
        </Stack>
      </Card>
    )
  }

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
      field: 'current',
      headerName: t('analisis.current'),
      width: 150,
      sortable: true,
      // Klik pertama langsung descending (besar ke kecil) — default MUI DataGrid
      // asc dulu bikin customer revenue 0 numpuk di atas, kelihatan salah arah.
      sortingOrder: ['desc', 'asc', null],
      renderCell: ({ row }) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2">{formatIDR(row.current.revenue)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>GP {formatIDR(row.current.margin)}</Typography>
        </Box>
      ),
    },
    ...(comparison !== 'yoy' ? [{
      field: 'previous',
      headerName: t('analisis.vsPrevious'),
      flex: 1.3,
      minWidth: 190,
      sortable: false,
      renderCell: ({ row }: { row: AnalisisRow }) => <ChangeCell comparison={row.previous} />,
    } as GridColDef<AnalisisRow>] : []),
    ...(comparison !== 'qoq' ? [{
      field: 'yoy',
      headerName: t('analisis.vsYoy'),
      flex: 1.3,
      minWidth: 190,
      sortable: false,
      renderCell: ({ row }: { row: AnalisisRow }) => <ChangeCell comparison={row.yoy} />,
    } as GridColDef<AnalisisRow>] : []),
    {
      field: '_status',
      headerName: t('common.status'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        hasAnyAlert(row)
          ? <StatusChip label={t('analisis.alert')} color="error" />
          : <StatusChip label={t('analisis.normal')} color="success" />
      ),
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="pageTitle">{t('analisis.title')}</Typography>
        <Typography variant="pageSubtitle">{t('analisis.subtitle')}</Typography>
      </Box>

      <Card sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: '1 1 200px' } }}>
            <InputLabel>{t('analisis.company')}</InputLabel>
            <Select
              value={companyId}
              label={t('analisis.company')}
              onChange={(e) => {
                setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                setPaginationModel((p) => ({ ...p, page: 0 }))
              }}
            >
              <MenuItem value="all">{t('analisis.allCompanies')}</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 }, flex: { sm: '1 1 180px' } }}>
            <InputLabel>{t('analisis.periodLabel')}</InputLabel>
            <Select
              value={periodType}
              label={t('analisis.periodLabel')}
              onChange={(e) => handlePeriodTypeChange(e.target.value as ParetoPeriodType)}
            >
              {PERIOD_TYPES.map((p) => (
                <MenuItem key={p} value={p}>{t(`paretoThreshold.period.${p}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: '1 1 200px' } }}>
            <InputLabel>{t('analisis.comparisonLabel')}</InputLabel>
            <Select
              value={comparison}
              label={t('analisis.comparisonLabel')}
              onChange={(e) => setComparison(e.target.value as AnalisisComparisonMode)}
            >
              {COMPARISON_MODES.map((c) => (
                <MenuItem key={c} value={c}>{t(`analisis.comparison.${c}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>

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

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <IconButton size="small" onClick={() => setPeriodKey(getPreviousPeriodKey(periodType, periodKey))}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2">
              {formatPeriodLabel(periodType, periodKey, periodTypeLabel)}
            </Typography>
            {isViewingInProgress && (
              <StatusChip size="small" color="warning" label={t('analisis.inProgress')} />
            )}
          </Stack>
          <IconButton
            size="small"
            disabled={periodKey === currentInProgressKey}
            onClick={() => setPeriodKey(getNextPeriodKey(periodType, periodKey))}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Card>

      <Card>
        <ResponsiveListView
          rows={rows}
          columns={columns}
          renderCard={renderReportCard}
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
