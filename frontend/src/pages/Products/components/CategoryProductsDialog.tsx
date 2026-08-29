import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import MuiTooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Dialog, StatusChip } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
import { useCategoryProducts } from '@/hooks/useProducts'
import { formatIDR } from '@/utils/format'
import type { GridColDef } from '@mui/x-data-grid'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { HmCustomerBreakdown } from '@/pages/ProductsHighMargin/components/HmCustomerBreakdown'
import type { HmTarget } from '@/pages/ProductsHighMargin/components/HmCustomerBreakdown'
import type { CategoryProductRow } from '@/types/products'

export interface CategoryDrawerInfo {
  category_id: number
  category_name: string
  is_high_margin?: boolean
  is_service?: boolean
  total_revenue?: number
  total_gp?: number
  gp_margin_percent?: number
  invoice_count?: number
  customer_count?: number
  last_sold_month?: string | null
}

interface Props {
  category: CategoryDrawerInfo | null
  companyId: number | 'all'
  branchId?: number
  division?: number
  periodMonth: string
  activeWindow: number
  excludeIntercompany?: boolean
  // Task008 — batasi daftar ke produk yang benar-benar ditandai high margin
  // (bukan semua produk kategori). Dipakai tab "Penetrasi Kategori" saja -
  // pemakai lain (tab Target Upsell, halaman Products) sengaja tidak pasang
  // prop ini supaya perilaku existingnya (semua produk kategori) tidak berubah.
  highMarginOnly?: boolean
  onClose: () => void
}

function MarginChip({ pct }: { pct: number }) {
  const color: 'success' | 'warning' | 'default' =
    pct >= 35 ? 'success' : pct >= 20 ? 'warning' : 'default'
  return <StatusChip label={`${pct.toFixed(1)}%`} color={color} />
}

export function CategoryProductsDialog({
  category,
  companyId,
  branchId,
  division,
  periodMonth,
  activeWindow,
  excludeIntercompany,
  highMarginOnly,
  onClose,
}: Props) {
  const { t } = useTranslation()

  // task017 — dialog ini punya 2 "view" yang SALING GANTI (bukan ditumpuk
  // sebagai 2 tabel dalam 1 layar, itu keputusan desain buruk — dikoreksi
  // setelah user komplain): 'products' (default, tabel produk kategori ini)
  // dan 'breakdown' (Capaian per Divisi + Customer Pembeli, utk kategori ATAU
  // 1 produk spesifik yang diklik). Direset tiap category_id berubah.
  //
  // "Adjust state during render" (pola resmi React utk reset state saat prop
  // berubah, lihat https://react.dev/learn/you-might-not-need-an-effect) —
  // BUKAN useEffect (useEffect+setState di sini kena lint error "cascading
  // renders"). Percobaan pertama pola ini bikin infinite loop karena bandingin
  // category?.category_id (bisa undefined) mentah-mentah ke state number|null
  // (undefined !== null SELALU true) — sekarang dinormalisasi ke null dulu.
  const [breakdownTarget, setBreakdownTarget] = useState<HmTarget & { name: string } | null>(null)
  const [syncedCategoryId, setSyncedCategoryId] = useState<number | null>(null)
  const currentCategoryId = category?.category_id ?? null
  if (currentCategoryId !== syncedCategoryId) {
    setSyncedCategoryId(currentCategoryId)
    if (breakdownTarget !== null) setBreakdownTarget(null)
  }

  const { data, isLoading } = useCategoryProducts(
    category
      ? {
          company_id:   companyId,
          category_id:  category.category_id,
          branch_id:    branchId,
          division,
          period_month: periodMonth,
          active_window: activeWindow,
          exclude_intercompany: excludeIntercompany,
          high_margin_only: highMarginOnly,
          per_page: 100,
        }
      : null,
  )

  // Task008 — kalau highMarginOnly, kartu summary HARUS pakai agregat produk
  // yang sudah difilter (dari backend, meta.summary) - BUKAN category.total_revenue
  // dkk yang dikirim caller, karena itu angka KATEGORI utuh (semua produk),
  // beda dari daftar produk yang sudah difilter di bawahnya (laporan user
  // 2026-07-26: kartu summary & tabel produk kelihatan tidak sinkron).
  const summary = data?.meta.summary as Partial<{
    total_revenue: number
    total_gp: number
    gp_margin_percent: number
    invoice_count: number
    customer_count: number
  }> | undefined

  const stats = highMarginOnly && summary
    ? { ...category, ...summary }
    : category

  const columns: GridColDef<CategoryProductRow>[] = [
    {
      field: 'product_name',
      headerName: t('products.drawer.colProductName'),
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{row.product_name}</Typography>
          {row.is_high_margin && (
            <StatusChip label={t('products.highMarginBadge')} color="info" />
          )}
        </Box>
      ),
    },
    {
      field: 'total_revenue',
      headerName: t('products.drawer.colRevenue'),
      width: 130,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatIDR(v as number),
    },
    {
      field: 'total_gp',
      headerName: t('products.drawer.colGp'),
      width: 120,
      type: 'number',
      sortable: false,
      valueFormatter: (v) => formatIDR(v as number),
    },
    {
      field: 'gp_margin_percent',
      headerName: t('products.drawer.colMargin'),
      width: 100,
      sortable: false,
      renderCell: ({ row }) => <MarginChip pct={row.gp_margin_percent} />,
    },
    {
      field: 'invoice_count',
      headerName: t('products.drawer.colInvoice'),
      width: 80,
      type: 'number',
      sortable: false,
    },
    {
      field: 'customer_count',
      headerName: t('products.drawer.colCustomer'),
      width: 90,
      type: 'number',
      sortable: false,
    },
    // task017 — kolom "Assign To" cuma relevan di konteks HM (highMarginOnly),
    // pemakai lain dialog ini (Target Upsell, halaman Products biasa) sengaja
    // tidak ikut tampilkan (mirror pola onlyHighMargin di komentar Props di atas).
    ...(highMarginOnly ? [{
      field: 'assign_to',
      headerName: t('productsHighMargin.assignTo'),
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }: { row: CategoryProductRow }) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', py: 0.5 }}>
          {row.assign_to.map((d) => (
            <Chip key={d.id} size="small" label={d.label} variant="outlined" />
          ))}
        </Stack>
      ),
    } as GridColDef<CategoryProductRow>] : []),
  ]

  return (
    <Dialog
      open={!!category}
      onClose={onClose}
      maxWidth="md"
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {category?.category_name ?? '—'}
          {category?.is_high_margin && (
            <StatusChip label={t('products.highMarginBadge')} color="info" />
          )}
          {category?.is_service && (
            <StatusChip label={t('products.drawer.serviceBadge')} color="info" />
          )}
        </Box>
      }
      subtitle={
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('products.drawer.subtitle', { window: activeWindow })}
        </Typography>
      }
      showCloseButton
    >
      {/* Summary stats — cuma tampil di view produk, biar tidak dobel dgn kartu
          ringkasan di dalam HmCustomerBreakdown pas view breakdown aktif. */}
      {!breakdownTarget && stats && (stats.total_revenue !== undefined) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
            mb: 2,
          }}
        >
          {[
            { label: t('products.drawer.statTotalRevenue'), value: formatIDR(stats.total_revenue ?? 0) },
            { label: t('products.drawer.statTotalGp'),      value: formatIDR(stats.total_gp ?? 0) },
            { label: t('products.drawer.statMargin'),        value: `${(stats.gp_margin_percent ?? 0).toFixed(1)}%` },
            { label: t('products.drawer.statInvoice'),        value: String(stats.invoice_count ?? '—'), unique: true },
            { label: t('products.drawer.statCustomer'),      value: String(stats.customer_count ?? '—'), unique: true },
            { label: t('products.drawer.statLastSold'), value: stats.last_sold_month ?? '—' },
          ].map(({ label, value, unique }) => (
            <Box key={label} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {label}
                </Typography>
                {unique && (
                  <MuiTooltip
                    title={t('products.drawer.statUniqueTooltip')}
                    placement="top"
                    arrow
                    slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: 12, lineHeight: 1.5 } } }}
                  >
                    <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
                      <InfoOutlinedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </MuiTooltip>
                )}
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* task017 — HANYA 1 tabel yang tampil sekaligus: produk (default) ATAU
          breakdown+customer (setelah klik baris produk / link kategori). */}
      {breakdownTarget ? (
        <Box>
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => setBreakdownTarget(null)}
            sx={{ mb: 1.5 }}
          >
            {t('productsHighMargin.buyers.backToProducts')}
          </Button>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            {breakdownTarget.type === 'product'
              ? t('productsHighMargin.buyers.contextProduct', { name: breakdownTarget.name })
              : t('productsHighMargin.buyers.contextCategory', { name: breakdownTarget.name })}
          </Typography>
          <HmCustomerBreakdown
            target={breakdownTarget}
            companyId={companyId}
            branchId={branchId}
            division={division}
            periodMonth={periodMonth}
            activeWindow={activeWindow}
            excludeIntercompany={excludeIntercompany}
          />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('products.drawer.listTitle', { count: data?.meta.total ?? '…' })}
            </Typography>
            {highMarginOnly && category && (
              <Button
                size="small"
                variant="text"
                endIcon={<ChevronRightIcon fontSize="small" />}
                onClick={() => setBreakdownTarget({ type: 'category', id: category.category_id, name: category.category_name })}
              >
                {t('productsHighMargin.buyers.viewCategoryBreakdown')}
              </Button>
            )}
          </Box>

          {isLoading ? (
            <Stack spacing={1}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          ) : (
            <ResponsiveListView
              rows={data?.data ?? []}
              columns={columns}
              rowCount={data?.meta.total ?? 0}
              loading={false}
              error={null}
              paginationMode="client"
              height={420}
              pageSizeOptions={[25, 50, 100]}
              // task017 — klik baris produk GANTI tampilan ke breakdown produk itu
              // (bukan nambah tabel kedua di bawahnya) — cuma aktif di konteks HM.
              onRowClick={highMarginOnly ? (row) => {
                const r = row as unknown as CategoryProductRow
                setBreakdownTarget({ type: 'product', id: r.product_id, name: r.product_name })
              } : undefined}
            />
          )}
        </>
      )}
    </Dialog>
  )
}
