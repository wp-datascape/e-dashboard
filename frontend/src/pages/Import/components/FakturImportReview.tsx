// FakturImportReview.tsx (task037/EDASHBOARD-588) — dialog review SETELAH
// upload file Faktur (tahap preview, BELUM tulis DB), sebelum commit.
// Beda dari HighMarginImportReview.tsx (task036): tabel PER BARIS dengan
// pagination (bisa ribuan invoice, reuse ResponsiveListView, bukan Card
// per baris), konflik invoice (nomor faktur sudah ada) WAJIB dipilih per
// baris Timpa/Lewati oleh user (keputusan bisnis, bukan auto-overwrite
// diam-diam seperti sebelumnya) — lihat docs-v2/task/task037.md.
import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { GridColDef } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import { Card, Dialog, StatusChip, Button, ProgressBar } from '@/components/ui'
import { ResponsiveListView } from '@/components/tables/ResponsiveListView'
import { useImportCommitProgress } from '@/hooks/useImport'
import { formatRupiah } from '@/utils/format'
import { formatDateTimeID } from '@/utils/date'
import type { FakturImportPreviewResult, FakturImportPreviewRow, FakturImportCommitInvoice, FakturImportItem } from '@/types/import'

interface Props {
  open: boolean
  companyId: number
  periodMonth: string
  preview: FakturImportPreviewResult | null
  onDone: () => void
  onCancel: () => void
}

type ConflictChoice = 'update' | 'skip'

interface ReviewRow extends FakturImportPreviewRow {
  id: string
  _kind: 'invoice'
}

// Baris semu (BUKAN data invoice sungguhan) — disisipkan tepat di bawah baris
// invoice yang di-expand, sel pertamanya di-colSpan penuh selebar tabel utk
// menampilkan rincian item. Trik ini dipakai krn `@mui/x-data-grid` versi
// gratis (BUKAN -pro) TIDAK punya fitur detail-panel/master-detail resmi —
// dikonfirmasi via context7 docs MUI X (master-detail row panels HANYA ada di
// DataGridPro). `colSpan` sendiri tersedia gratis, jadi baris semu + colSpan
// adalah cara community-tier utk expand row (lihat kolom `_expand` di bawah).
// HANYA disisipkan saat desktop (lihat `isMobile` di bawah) — versi mobile
// (custom `renderCard`) menampilkan rincian item LANGSUNG di dalam card
// invoice-nya sendiri, tidak butuh baris semu ini sama sekali.
interface DetailRow {
  id: string
  _kind: 'detail'
  items: FakturImportItem[]
}

type AnyRow = ReviewRow | DetailRow

function ItemsDetailTable({ items }: { items: FakturImportItem[] }) {
  const { t } = useTranslation()
  return (
    <Table size="small" sx={{ width: '100%', my: 1 }}>
      <TableHead>
        <TableRow>
          <TableCell>{t('import.form.reviewItemColProduct')}</TableCell>
          <TableCell align="right">{t('import.form.reviewItemColQty')}</TableCell>
          <TableCell align="right">{t('import.form.reviewItemColUnitPrice')}</TableCell>
          <TableCell align="right">{t('import.form.reviewColRevenue')}</TableCell>
          <TableCell align="right">{t('import.form.reviewItemColGp')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((it, idx) => (
          <TableRow key={idx}>
            <TableCell>{it.item_name || it.product_category}</TableCell>
            <TableCell align="right">{it.quantity ?? '-'}</TableCell>
            <TableCell align="right">{it.unit_price != null ? formatRupiah(it.unit_price) : '-'}</TableCell>
            <TableCell align="right">{formatRupiah(it.revenue)}</TableCell>
            <TableCell align="right">{formatRupiah(it.gross_profit)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function FakturImportReview({ open, companyId, periodMonth, preview, onDone, onCancel }: Props) {
  const { t } = useTranslation()
  const theme = useTheme()
  // Breakpoint SAMA PERSIS dgn yang dipakai ResponsiveListView sendiri
  // (lihat ResponsiveListView.tsx) — WAJIB identik, dipakai di sini cuma
  // utk memutuskan apakah baris detail semu (lihat DetailRow di atas) perlu
  // disisipkan (desktop) atau tidak (mobile, renderCard urus sendiri).
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Default 'update' (Timpa) per baris konflik — samakan perilaku lama
  // (auto-overwrite), user aktif pilih "Lewati" kalau memang mau
  // mengecualikan baris tertentu (keputusan user, docs-v2/task/task037.md).
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({})
  const [detailRow, setDetailRow] = useState<ReviewRow | null>(null)
  // Invoice mana yang rincian itemnya lagi di-expand — Set (bukan 1 id
  // exclusive) krn user mungkin mau bandingkan beberapa invoice sekaligus
  // sambil scroll, dipakai bareng oleh jalur desktop (colSpan) & mobile
  // (custom renderCard), satu sumber kebenaran yang sama.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggleExpand = (invoiceNumber: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(invoiceNumber)) next.delete(invoiceNumber)
      else next.add(invoiceNumber)
      return next
    })
  }

  const commit = useImportCommitProgress()
  const isProcessing = commit.phase === 'uploading' || commit.phase === 'processing'
  const isDone = commit.phase === 'done'
  const isError = commit.phase === 'error'

  const getChoice = (invoiceNumber: string): ConflictChoice => choices[invoiceNumber] ?? 'update'

  const rows = useMemo<AnyRow[]>(() => {
    const result: AnyRow[] = []
    for (const inv of preview?.invoices ?? []) {
      result.push({ ...inv, id: inv.invoice_number, _kind: 'invoice' })
      if (!isMobile && expandedIds.has(inv.invoice_number) && inv.items.length > 0) {
        result.push({ id: `${inv.invoice_number}__detail`, _kind: 'detail', items: inv.items })
      }
    }
    return result
  }, [preview, expandedIds, isMobile])

  // Baris error TIDAK PERNAH dikirim ke commit (target tidak valid). Baris
  // konflik yang user pilih "Lewati" juga tidak dikirim — backend tidak
  // perlu menyentuhnya sama sekali (beda dari baris baru yang selalu
  // action 'create', konflik yang tidak di-skip jadi 'update').
  const committableInvoices = useMemo(() => {
    const result: FakturImportCommitInvoice[] = []
    if (!preview) return result
    for (const inv of preview.invoices) {
      if (inv.status === 'error') continue
      if (inv.status === 'conflict' && getChoice(inv.invoice_number) === 'skip') continue
      result.push({
        invoice_number: inv.invoice_number,
        action: inv.status === 'conflict' ? 'update' : 'create',
        invoice_date: inv.invoice_date,
        customer_code: inv.customer_code,
        customer_name: inv.customer_name,
        branch_name: inv.branch_name,
        channel_name: inv.channel_name,
        items: inv.items,
      })
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, choices])

  const skippedCount = useMemo(
    () => preview?.invoices.filter((r) => r.status === 'conflict' && getChoice(r.invoice_number) === 'skip').length ?? 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, choices],
  )

  const handleBulkChoice = (choice: ConflictChoice) => {
    if (!preview) return
    setChoices(Object.fromEntries(
      preview.invoices.filter((r) => r.status === 'conflict').map((r) => [r.invoice_number, choice]),
    ))
  }

  const handleApply = () => {
    if (!preview || committableInvoices.length === 0) return
    void commit.mutate({
      company_id: companyId,
      period_month: periodMonth,
      filename: preview.filename,
      invoices: committableInvoices,
    })
  }

  const resetState = () => {
    setChoices({})
    setDetailRow(null)
    setExpandedIds(new Set())
    commit.reset()
  }

  const handleCancel = () => { resetState(); onCancel() }
  const handleDone = () => { resetState(); onDone() }

  const columns: GridColDef<AnyRow>[] = [
    {
      field: '_expand',
      headerName: '',
      width: 40,
      sortable: false,
      // Sel ini yang di-colSpan penuh selebar tabel utk baris detail semu
      // (lihat DetailRow di atas) — dipakai "menampung" ItemsDetailTable.
      // Signature colSpan itu POSITIONAL (value, row, column) — BUKAN 1
      // object `params`, walau declaration file GridColDef menyebutnya
      // `(params: GridCellParams) => number` (JSDoc MUI-nya menyesatkan,
      // dikonfirmasi lewat error runtime nyata: "Cannot read properties of
      // undefined (reading 'row')" saat sempat ditulis `(params) =>
      // params.row`).
      colSpan: (_value, row) => ((row as AnyRow)._kind === 'detail' ? columns.length : undefined),
      renderCell: ({ row }) => {
        if (row._kind === 'detail') return <ItemsDetailTable items={row.items} />
        if (row.items.length === 0) return null
        const expanded = expandedIds.has(row.invoice_number)
        return (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); toggleExpand(row.invoice_number) }}
            aria-label={t('import.form.reviewViewItems', { count: row.item_count })}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        )
      },
    },
    {
      field: 'invoice_number',
      headerName: t('import.form.reviewColInvoice'),
      width: 150,
    },
    {
      field: 'invoice_date',
      headerName: t('import.form.reviewColDate'),
      width: 110,
      renderCell: ({ row }) => {
        const inv = row as ReviewRow
        return inv.invoice_date ? inv.invoice_date.replace(/\//g, '-') : '-'
      },
    },
    {
      field: 'customer_name',
      headerName: t('import.form.reviewColCustomer'),
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (row as ReviewRow).customer_name || '-',
    },
    {
      field: 'item_count',
      headerName: t('import.form.reviewColItems'),
      width: 90,
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'total_revenue',
      headerName: t('import.form.reviewColRevenue'),
      width: 160,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => formatRupiah((row as ReviewRow).total_revenue),
    },
    {
      field: 'status',
      headerName: t('common.status'),
      width: 110,
      renderCell: ({ row }) => {
        const inv = row as ReviewRow
        return (
          <StatusChip
            label={inv.status === 'new' ? t('import.form.reviewStatusNewLabel') : inv.status === 'conflict' ? t('import.form.reviewStatusConflictLabel') : t('import.form.reviewStatusErrorLabel')}
            color={inv.status === 'new' ? 'success' : inv.status === 'conflict' ? 'warning' : 'error'}
          />
        )
      },
    },
    {
      field: '_actions',
      headerName: t('import.form.reviewColAction'),
      width: 220,
      sortable: false,
      renderCell: ({ row }) => {
        const inv = row as ReviewRow
        if (inv.status !== 'conflict') return null
        return (
          <Box onClick={(e) => e.stopPropagation()}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={getChoice(inv.invoice_number)}
              onChange={(_, v) => { if (v) setChoices((prev) => ({ ...prev, [inv.invoice_number]: v })) }}
            >
              <ToggleButton value="update">{t('import.form.reviewOverwrite')}</ToggleButton>
              <ToggleButton value="skip">{t('import.form.reviewSkip')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )
      },
    },
  ]

  return (
    <>
      <Dialog
        open={open}
        onClose={() => { if (isProcessing) return; if (isDone) handleDone(); else handleCancel() }}
        title={t('import.form.reviewTitle')}
        subtitle={preview && !isProcessing && !isDone && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.75 }}>
            <StatusChip label={t('import.form.reviewStatusNewCount', { count: preview.summary.new })} color="success" />
            <StatusChip label={t('import.form.reviewStatusConflictCount', { count: preview.summary.conflict })} color="warning" />
            <StatusChip label={t('import.form.reviewStatusErrorCount', { count: preview.summary.error })} color="error" />
          </Box>
        )}
        maxWidth="lg"
        fullWidth
        actions={isDone ? [
          { label: t('common.close'), onClick: handleDone, variant: 'text' },
        ] : isProcessing ? [] : [
          { label: t('common.cancel'), onClick: handleCancel, variant: 'text' },
          {
            label: t('import.form.reviewApply', { count: committableInvoices.length }),
            onClick: handleApply,
            disabled: committableInvoices.length === 0,
          },
        ]}
      >
        {isDone && commit.result ? (
          <Stack spacing={1.5}>
            <Alert severity={commit.result.error_rows > 0 ? 'warning' : 'success'}>
              {t('import.form.reviewCommitSummary', {
                success: commit.result.success_invoices,
                errors: commit.result.error_rows,
              })}
            </Alert>
            {(commit.result.skipped_invoices ?? 0) > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t('import.form.reviewSkippedSummary', { count: commit.result.skipped_invoices })}
              </Typography>
            )}
          </Stack>
        ) : isProcessing ? (
          <Box>
            <ProgressBar
              total={commit.progress.total}
              success={commit.progress.success}
              error={commit.progress.errors}
              status={commit.phase === 'uploading' ? 'loading' : undefined}
              size="md"
              showLabel={false}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
              {commit.phase === 'uploading'
                ? t('import.form.loading')
                : t('import.form.rowsProcessed', { processed: commit.progress.processed.toLocaleString(), total: commit.progress.total.toLocaleString() })}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {isError && commit.errorMessage && (
              <Alert severity="error">{commit.errorMessage}</Alert>
            )}
            {(preview?.summary.conflict ?? 0) > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button size="small" variant="outlined" onClick={() => handleBulkChoice('update')}>
                  {t('import.form.reviewBulkOverwrite')}
                </Button>
                <Button size="small" variant="outlined" onClick={() => handleBulkChoice('skip')}>
                  {t('import.form.reviewBulkSkip')}
                </Button>
              </Box>
            )}
            <ResponsiveListView
              rows={rows}
              columns={columns}
              getRowHeight="auto"
              height={420}
              emptyMessage={t('common.noData')}
              onRowClick={(row) => {
                const r = row as unknown as AnyRow
                if (r._kind === 'invoice' && r.status === 'conflict') setDetailRow(r)
              }}
              renderCard={(row) => {
                const r = row as unknown as AnyRow
                // Baris detail semu (desktop-only, lihat DetailRow) tidak
                // pernah masuk `rows` di mode mobile (di-filter saat rows
                // dibangun) — guard ini murni jaga-jaga.
                if (r._kind === 'detail') return null
                const inv = r
                const expanded = expandedIds.has(inv.invoice_number)
                return (
                  <Card key={inv.id} sx={{ mb: 1.5, p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                        {inv.invoice_number}
                      </Typography>
                      <StatusChip
                        label={inv.status === 'new' ? t('import.form.reviewStatusNewLabel') : inv.status === 'conflict' ? t('import.form.reviewStatusConflictLabel') : t('import.form.reviewStatusErrorLabel')}
                        color={inv.status === 'new' ? 'success' : inv.status === 'conflict' ? 'warning' : 'error'}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {inv.customer_name || '-'} · {inv.invoice_date ? inv.invoice_date.replace(/\//g, '-') : '-'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {formatRupiah(inv.total_revenue)}
                    </Typography>

                    {inv.status === 'conflict' && (
                      <Box sx={{ mt: 1 }}>
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={getChoice(inv.invoice_number)}
                          onChange={(_, v) => { if (v) setChoices((prev) => ({ ...prev, [inv.invoice_number]: v })) }}
                        >
                          <ToggleButton value="update">{t('import.form.reviewOverwrite')}</ToggleButton>
                          <ToggleButton value="skip">{t('import.form.reviewSkip')}</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    )}

                    {inv.status === 'conflict' && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setDetailRow(inv)}
                        sx={{ mt: 0.5, px: 0 }}
                      >
                        {t('import.form.reviewViewConflictDetail')}
                      </Button>
                    )}

                    {inv.items.length > 0 && (
                      <>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => toggleExpand(inv.invoice_number)}
                          endIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          sx={{ mt: 0.5, px: 0 }}
                        >
                          {t('import.form.reviewViewItems', { count: inv.item_count })}
                        </Button>
                        {expanded && <ItemsDetailTable items={inv.items} />}
                      </>
                    )}
                  </Card>
                )
              }}
            />
            {skippedCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {t('import.form.reviewSkippedSummary', { count: skippedCount })}
              </Typography>
            )}
          </Stack>
        )}
      </Dialog>

      {/* Detail konflik: data lama (sistem) vs data baru (file) berdampingan
          — biar user bisa lihat "keputusan bisnis"-nya sebelum pilih
          Timpa/Lewati (docs-v2/task/task037.md). */}
      <Dialog
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={t('import.form.reviewDetailTitle', { invoice: detailRow?.invoice_number ?? '' })}
        maxWidth="sm"
        fullWidth
        actions={[{ label: t('common.close'), onClick: () => setDetailRow(null), variant: 'text' }]}
      >
        {detailRow && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{t('import.form.hmDataOld')}</Typography>
              <Typography variant="body2">
                {formatRupiah(detailRow.conflict?.total_revenue ?? 0)}<br />
                {detailRow.conflict?.updated_at && t('import.form.reviewLastUpdated', { date: formatDateTimeID(detailRow.conflict.updated_at) })}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{t('import.form.hmDataNew')}</Typography>
              <Typography variant="body2">
                {formatRupiah(detailRow.total_revenue)}<br />
                {t('import.form.reviewItemCount', { count: detailRow.item_count })}
              </Typography>
            </Grid>
            <Grid size={12}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={getChoice(detailRow.invoice_number)}
                onChange={(_, v) => { if (v) setChoices((prev) => ({ ...prev, [detailRow.invoice_number]: v })) }}
              >
                <ToggleButton value="update">{t('import.form.reviewOverwrite')}</ToggleButton>
                <ToggleButton value="skip">{t('import.form.reviewSkip')}</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        )}
      </Dialog>
    </>
  )
}
