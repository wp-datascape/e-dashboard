import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { Card, StatusChip } from '@/components/ui'
import { MonthYearPicker } from '@/components/ui/MonthYearPicker'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle'
import { useCompanies } from '@/hooks/useCompanies'
import { useAnalisis } from '@/hooks/useAnalisis'
import { formatIDR, formatIDRSigned } from '@/utils/format'
import {
  getCurrentPeriodKey, getLatestClosedPeriodKey, getPreviousPeriodKey, getNextPeriodKey,
  getYoyPeriodKey, formatPeriodLabel, getPeriodDateRange, formatDateRange,
} from '@/utils/analisisPeriod'
import { MetricPair, MetricPercentPair, ComparisonSections } from '@/components/analisis/ComparisonMetrics'
import { trendColor } from '@/utils/analisisComparison'
import type { AnalisisPeriodType, AnalisisComparisonBasis, AnalisisRow } from '@/types/analisis'

// Urutan terpendek -> terpanjang (UI/UX review 2026-07-31).
const PERIOD_TYPES: AnalisisPeriodType[] = ['monthly', 'quarter', 'semester', 'ytd', 'annual']
const COMPARISON_BASES: AnalisisComparisonBasis[] = ['last_year', 'previous_period']

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

  // Baca filter awal dari query string (SEKALI, saat mount) — dipakai tombol
  // "Lihat di Analisis" di popup detail notifikasi biar halaman ini kebuka
  // dengan data yang PERSIS sama dengan yang disebut di pesan notifikasi
  // (company/periode/pembanding/search), bukan halaman generik kosong.
  const [searchParams] = useSearchParams()
  const initialPeriodType = (PERIOD_TYPES as string[]).includes(searchParams.get('period_type') ?? '')
    ? (searchParams.get('period_type') as AnalisisPeriodType)
    : 'quarter'
  const initialComparison: AnalisisComparisonBasis =
    searchParams.get('comparison') === 'previous_period' ? 'previous_period' : 'last_year'

  const [companyId, setCompanyId] = useState<number | 'all'>(() => {
    const v = searchParams.get('company_id')
    return v ? Number(v) : 'all'
  })
  const [periodType, setPeriodType] = useState<AnalisisPeriodType>(initialPeriodType)
  const [periodKey, setPeriodKey] = useState<string>(() => searchParams.get('period_key') || getLatestClosedPeriodKey(initialPeriodType))
  const [comparison, setComparison] = useState<AnalisisComparisonBasis>(initialComparison)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [onlyPareto, setOnlyPareto] = useState(false)
  const [excludeIntercompany, setExcludeIntercompany] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })

  // Kolom 'current' (Periode Ini) satu-satunya yang sortable — sort by revenue.
  // Selain itu 'default' = prioritas Pareto duluan lalu nama alfabetis (task016 §12).
  const sortBy = sortModel[0]?.field === 'current' ? 'revenue' : 'default'
  const sortDir = sortModel[0]?.sort ?? 'desc'

  const handlePeriodTypeChange = (nextType: AnalisisPeriodType) => {
    setPeriodType(nextType)
    setPeriodKey(getLatestClosedPeriodKey(nextType))
    // YTD tidak punya "periode sebelumnya" yang apple-to-apple (lihat catatan
    // di bawah) — reset ke satu-satunya opsi yang valid biar tidak nyangkut
    // di pilihan yang sudah tidak berlaku.
    if (nextType === 'ytd') setComparison('last_year')
  }

  const currentInProgressKey = getCurrentPeriodKey(periodType)
  const isViewingInProgress = periodKey === currentInProgressKey
  // Key periode pembanding — ikut filter "Pembanding" yang dipilih user
  // (UI/UX review 2026-07-31). Label kolom/caption SELALU "Pembanding"/
  // "Periode" statis (bukan "Tahun Lalu"/"Periode Sebelumnya" dinamis) —
  // basis yang dipilih tetap kelihatan lewat dropdown filternya sendiri.
  // YTD SENGAJA dikecualikan dari 'previous_period': range YTD selalu mulai
  // 1 Jan tahun berjalan, jadi "mundur 1 bulan" menghasilkan rentang beda
  // panjang bulan (Jan-Jul vs Jan-Jun) — tidak apple-to-apple. Satu-satunya
  // pembanding adil untuk YTD adalah YTD tahun lalu di bulan akhir yang SAMA.
  const comparisonKey = comparison === 'previous_period' && periodType !== 'ytd'
    ? getPreviousPeriodKey(periodType, periodKey)
    : getYoyPeriodKey(periodType, periodKey)
  const currentRangeText = formatDateRange(getPeriodDateRange(periodType, periodKey))
  const comparisonRangeText = formatDateRange(getPeriodDateRange(periodType, comparisonKey))

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
    row.comparison.revenue_alert || row.comparison.margin_alert

  const revLabel = t('analisis.metricRevenue')
  const gmLabel = t('analisis.metricMargin')
  const newBusinessLabel = t('analisis.newBusiness')

  const renderReportCard = (rawRow: Record<string, unknown>) => {
    const row = rawRow as unknown as AnalisisRow
    const alert = hasAnyAlert(row)
    return (
      <Card key={row.customer_id} sx={{ mb: 2, p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{row.customer_name}</Typography>
                {row.is_pareto && <ParetoBadge />}
              </Stack>
              <Typography variant="caption" color="text.secondary" noWrap>{row.company_name ?? '-'}</Typography>
            </Box>
            <StatusChip
              label={alert ? t('analisis.critical') : t('analisis.normal')}
              color={alert ? 'error' : 'success'}
            />
          </Stack>

          <ComparisonSections
            comparisonSectionLabel={t('analisis.comparisonLabel')}
            periodSectionLabel={t('analisis.periodLabel')}
            changeValueSectionLabel={t('analisis.changeValue')}
            changePercentSectionLabel={t('analisis.changePercent')}
            current={row.current}
            comparison={row.comparison}
            revenueLabel={revLabel}
            marginLabel={gmLabel}
            newBusinessLabel={newBusinessLabel}
          />
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
      field: 'periode_lampau',
      headerName: t('analisis.comparisonLabel'),
      width: 170,
      sortable: false,
      renderCell: ({ row }) => (
        <MetricPair revenueLabel={revLabel} marginLabel={gmLabel} revenueText={formatIDR(row.comparison.revenue)} marginText={formatIDR(row.comparison.margin)} />
      ),
    },
    {
      field: 'current',
      headerName: t('analisis.periodLabel'),
      width: 170,
      sortable: true,
      // Klik pertama langsung descending (besar ke kecil) — default MUI DataGrid
      // asc dulu bikin customer revenue 0 numpuk di atas, kelihatan salah arah.
      sortingOrder: ['desc', 'asc', null],
      renderCell: ({ row }) => (
        <MetricPair revenueLabel={revLabel} marginLabel={gmLabel} revenueText={formatIDR(row.current.revenue)} marginText={formatIDR(row.current.margin)} />
      ),
    },
    {
      field: 'changeValue',
      headerName: t('analisis.changeValue'),
      width: 170,
      sortable: false,
      renderCell: ({ row }) => (
        <MetricPair
          revenueLabel={revLabel}
          marginLabel={gmLabel}
          revenueText={formatIDRSigned(row.comparison.revenue_change_value)}
          marginText={formatIDRSigned(row.comparison.margin_change_value)}
          revenueColor={trendColor(row.comparison.revenue_change_pct, row.comparison.revenue_alert)}
          marginColor={trendColor(row.comparison.margin_change_pct, row.comparison.margin_alert)}
        />
      ),
    },
    {
      field: 'changePercent',
      headerName: t('analisis.changePercent'),
      width: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <MetricPercentPair
          revenueLabel={revLabel}
          marginLabel={gmLabel}
          revenuePct={row.comparison.revenue_change_pct}
          marginPct={row.comparison.margin_change_pct}
          revenueAlert={row.comparison.revenue_alert}
          marginAlert={row.comparison.margin_alert}
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

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 }, flex: { sm: '1 1 160px' } }}>
            <InputLabel>{t('analisis.periodLabel')}</InputLabel>
            <Select
              value={periodType}
              label={t('analisis.periodLabel')}
              onChange={(e) => handlePeriodTypeChange(e.target.value as AnalisisPeriodType)}
            >
              {PERIOD_TYPES.map((p) => (
                <MenuItem key={p} value={p}>{t(`paretoThreshold.period.${p}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 }, flex: { sm: '1 1 170px' } }}>
            <InputLabel>{t('analisis.comparisonLabel')}</InputLabel>
            <Select
              value={comparison}
              label={t('analisis.comparisonLabel')}
              onChange={(e) => setComparison(e.target.value as AnalisisComparisonBasis)}
            >
              {COMPARISON_BASES
                // YTD cuma punya 1 pembanding yang valid (apple-to-apple) — lihat catatan di comparisonKey.
                .filter((c) => periodType !== 'ytd' || c === 'last_year')
                .map((c) => (
                  <MenuItem key={c} value={c}>{t(`analisis.comparisonOption.${c}`)}</MenuItem>
                ))}
            </Select>
          </FormControl>

          {(periodType === 'monthly' || periodType === 'ytd') && (
            <MonthYearPicker
              size="small"
              label={t('analisis.periodDataLabel')}
              value={periodKey}
              onChange={setPeriodKey}
              maxDate={currentInProgressKey}
              sx={{ minWidth: { xs: '100%', sm: 170 }, flex: { sm: '1 1 170px' } }}
            />
          )}

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
          <IconButton size="small" sx={{ flexShrink: 0 }} onClick={() => setPeriodKey(getPreviousPeriodKey(periodType, periodKey))}>
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
