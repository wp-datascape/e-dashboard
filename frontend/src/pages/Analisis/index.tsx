import { useState, useEffect } from 'react'
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
import { ParetoFilterToggle } from '@/components/filters/ParetoFilterToggle'
import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import { useAnalisis } from '@/hooks/useAnalisis'
import { formatRupiah, formatRupiahSigned } from '@/utils/format'
import {
  getCurrentPeriodKey, getPeriodDateRange, formatDateRange, formatPeriodLabel, shiftDateByYears, shiftEndDate,
} from '@/utils/analisisPeriod'
import { MetricPair, MetricPercentPair } from '@/components/analisis/ComparisonMetrics'
import { trendColor } from '@/utils/analisisComparison'
import { clampDateNotFuture } from '@/utils/date'
import type { AnalisisPeriodType, AnalisisRow } from '@/types/analisis'

// Urutan terpendek -> terpanjang (UI/UX review 2026-07-31).
const PERIOD_TYPES: AnalisisPeriodType[] = ['monthly', 'quarter', 'semester', 'ytd', 'annual']

function todayISODate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

  // Baca filter awal dari query string (SEKALI, saat mount) — dipakai tombol
  // "Lihat di Analisis" di popup detail notifikasi biar halaman ini kebuka
  // dengan data yang PERSIS sama dengan yang disebut di pesan notifikasi
  // (company/periode/search), bukan halaman generik kosong. Kalau deep-link
  // bawa period_key (histori dari notifikasi lama), endDate awal dihitung dari
  // akhir NATURAL periode itu — bukan hari ini.
  const [searchParams] = useSearchParams()
  const initialPeriodType = (PERIOD_TYPES as string[]).includes(searchParams.get('period_type') ?? '')
    ? (searchParams.get('period_type') as AnalisisPeriodType)
    : 'quarter'
  const initialEndDate = (() => {
    const explicit = searchParams.get('end_date')
    if (explicit) return explicit
    const deepLinkPeriodKey = searchParams.get('period_key')
    if (deepLinkPeriodKey) {
      try {
        return getPeriodDateRange(initialPeriodType, deepLinkPeriodKey).end
      } catch {
        // period_key tidak valid utk periodType ini — abaikan, fallback hari ini.
      }
    }
    return todayISODate()
  })()

  // Filter Cabang & Divisi (task016 §27) — SSOT yang sama dipakai Customers/
  // Products/Transactions dkk (docs-v2/task/task001.md Task H), bukan implementasi
  // scope-aware terpisah lagi. Opsi branch/division SUDAH difilter sesuai hak
  // akses user (lihat useScopedCompanyFilter), jadi tidak perlu enforcement
  // tambahan di sisi frontend.
  const scopeFilter = useScopedCompanyFilter()
  const { companyId, setCompanyId, branchId, division, excludeIntercompany, setExcludeIntercompany } = scopeFilter

  // Deep-link company_id dari popup notifikasi (SEKALI saat mount) — hook
  // useScopedCompanyFilter tidak terima initial value langsung, jadi di-apply
  // via effect one-time, bukan reactive sync (sesuai catatan hook: hindari
  // setState sinkron REAKTIF di effect, tapi inisialisasi sekali dari URL beda
  // kasus — tidak ada dependency lain yang bisa berubah lagi setelah mount).
  useEffect(() => {
    const v = searchParams.get('company_id')
    if (v) setCompanyId(Number(v))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [periodType, setPeriodType] = useState<AnalisisPeriodType>(initialPeriodType)
  // "Tanggal" — filter tunggal pengganti period_key+Pembanding (task016 §26,
  // revisi 2026-08-01): user pilih TANGGAL PERSIS (bukan bulan), start range
  // selalu awal periode yang mengandung tanggal itu, end selalu tanggal itu
  // sendiri. Pembanding SELALU YoY (dropdown-nya dihapus), digeser -1 tahun
  // persis dari currentRange — lihat perhitungan currentRange/comparisonRange
  // di bawah, MIRROR 1-ke-1 logic backend analisis.service.ts.
  const [endDate, setEndDate] = useState<string>(initialEndDate)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [onlyPareto, setOnlyPareto] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 })

  // Kolom 'current' (Periode Ini) satu-satunya yang sortable — sort by revenue.
  // Selain itu 'default' = prioritas Pareto duluan lalu nama alfabetis (task016 §12).
  const sortBy = sortModel[0]?.field === 'current' ? 'revenue' : 'default'
  const sortDir = sortModel[0]?.sort ?? 'desc'

  const todayStr = todayISODate()
  const isViewingInProgress = endDate === todayStr

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate))
  const periodStart = getPeriodDateRange(periodType, periodKey).start
  const currentRange = { start: periodStart, end: endDate }
  const comparisonRange = { start: shiftDateByYears(periodStart, -1), end: shiftDateByYears(endDate, -1) }
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
  // DataGrid butuh field `id` unik per baris
  const rows = (data?.data ?? []).map((row) => ({ ...row, id: row.customer_id }))

  const hasAnyAlert = (row: AnalisisRow) =>
    row.comparison.revenue_alert || row.comparison.margin_alert

  const revLabel = t('analisis.metricRevenue')
  const gmLabel = t('analisis.metricMargin') // dipakai KHUSUS nilai persentase (rasio)
  const gpLabel = t('analisis.metricGP') // dipakai KHUSUS nilai Rupiah (angka absolut)
  const newBusinessLabel = t('analisis.newBusiness')

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
        <MetricPair revenueLabel={revLabel} marginLabel={gpLabel} revenueText={formatRupiah(row.comparison.revenue)} marginText={formatRupiah(row.comparison.margin)} />
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
        <MetricPair revenueLabel={revLabel} marginLabel={gpLabel} revenueText={formatRupiah(row.current.revenue)} marginText={formatRupiah(row.current.margin)} showLabels={false} />
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
          marginLabel={gpLabel}
          revenueText={formatRupiahSigned(row.comparison.revenue_change_value)}
          marginText={formatRupiahSigned(row.comparison.margin_change_value)}
          revenueColor={trendColor(row.comparison.revenue_change_pct, row.comparison.revenue_alert)}
          marginColor={trendColor(row.comparison.margin_change_pct, row.comparison.margin_alert)}
          showLabels={false}
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
              // Tidak boleh pilih tanggal di masa depan ATAU kosong
              // (2026-08-23, bug dilaporkan user: tombol clear bawaan
              // browser bikin value kosong → fetch error, seharusnya reset
              // ke hari ini) — clampDateNotFuture (utils/date.ts) SATU
              // tempat pusat. `max` di bawah cegah dari calendar widget.
              setEndDate(clampDateNotFuture(e.target.value, todayStr))
              setPaginationModel((p) => ({ ...p, page: 0 }))
            }}
            max={todayStr}
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

          <ParetoFilterToggle
            checked={onlyPareto}
            onChange={(checked) => {
              setOnlyPareto(checked)
              setPaginationModel((p) => ({ ...p, page: 0 }))
            }}
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
