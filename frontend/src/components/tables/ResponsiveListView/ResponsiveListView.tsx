// frontend/src/components/tables/ResponsiveListView/ResponsiveListView.tsx
import { useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  DataGrid,
  type GridColDef,
  type GridRowsProp,
  type GridPaginationModel,
  type GridSortModel,
  type GridRenderCellParams,
} from '@mui/x-data-grid';
import { Card } from '@/components/ui';
import { getApiErrorMessage } from '@/utils/apiError';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Accordion expand/collapse yang dipusatkan di ResponsiveListView (lihat
 * `expandedId` di bawah) — dipakai AutoCard maupun `renderCard` custom supaya
 * SEMUA card mobile (default atau custom) pakai logic exclusive-accordion yang
 * sama, bukan tiap halaman bikin `useState` sendiri (dulu sempat kejadian:
 * AutoCard multi-open, satu custom renderCard bikin sendiri exclusive-open —
 * 2 perilaku beda untuk 1 pola UI yang sama). */
export interface CardExpandState {
  expanded: boolean;
  onToggle: () => void;
}

export interface ResponsiveListViewProps {
  /** Row data */
  rows: GridRowsProp;
  /** Column definitions (same format as DataGrid) */
  columns: GridColDef[];
  /** Optional custom card renderer for mobile view. `expandState` (accordion
   * exclusive terpusat) opsional dipakai kalau card custom ini juga berbentuk
   * accordion — lihat `CardExpandState`. */
  renderCard?: (row: Record<string, unknown>, index: number, expandState: CardExpandState) => ReactNode;
  /** Row click handler (desktop DataGrid onRowClick + auto-generated cards) */
  onRowClick?: (row: Record<string, unknown>) => void;
  /** Loading state */
  loading?: boolean;
  /** Error state — if set, shows Alert */
  error?: Error | null;
  /** Message when rows is empty */
  emptyMessage?: string;
  /** Optional title shown at top of card area */
  title?: string;
  /** Initial page size for DataGrid (default 10, ignored if paginationModel passed) */
  pageSize?: number;
  /** DataGrid container height (default 400). Pass '100%' untuk fill flex parent. */
  height?: number | string;
  /** Baris auto-tinggi menyesuaikan konten (mis. kolom berisi banyak chip yang
   * wrap 2+ baris) - tanpa ini baris fixed 52px, konten yang overflow disembunyikan
   * (bukan cuma numpuk ke baris tetangga). Default: fixed (tidak di-set). */
  getRowHeight?: 'auto';
  /** Fields to show in auto-generated mobile card. Defaults to all columns that have a headerName. */
  mobileFields?: string[];
  // ─── Server-side pagination & sorting props ──────────────────────────────
  rowCount?: number;
  paginationMode?: 'client' | 'server';
  sortingMode?: 'client' | 'server';
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: Dispatch<SetStateAction<GridPaginationModel>>;
  sortModel?: GridSortModel;
  onSortModelChange?: Dispatch<SetStateAction<GridSortModel>>;
  pageSizeOptions?: number[];
}

// ─── AutoCard (default mobile renderer) ──────────────────────────────────────

function formatColumnValue(
  row: Record<string, unknown>,
  col: GridColDef,
): string {
  const raw = row[col.field];
  if (raw == null) return '—';
  if (col.valueFormatter) {
    return String((col.valueFormatter as (...args: unknown[]) => unknown)(raw, row));
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.label === 'string') return obj.label;
    if (typeof obj.code === 'string') return obj.code;
    const displayProps = ['title', 'text', 'value', 'description'];
    for (const prop of displayProps) {
      if (typeof obj[prop] === 'string') return obj[prop];
    }
    return '—';
  }
  return String(raw);
}

function AutoCard({
  row,
  columns,
  mobileFields,
  onRowClick,
  expandState,
}: {
  row: Record<string, unknown>;
  columns: GridColDef[];
  mobileFields: string[];
  onRowClick?: (row: Record<string, unknown>) => void;
  expandState: CardExpandState;
}) {
  const { t } = useTranslation();
  // Kolapsis by default — cuma field pertama (biasanya nama/judul) yang selalu
  // terlihat, field lain (revenue, GP, tanggal, dst.) baru muncul saat di-expand.
  // Permintaan user: card mobile yang selalu tampil semua field (versi lama)
  // kepanjangan & bikin nama utama ketimpa/terpotong. Field pertama TIDAK
  // diulang di body — sudah terwakili di header accordion.
  // WAJIB map dari `mobileFields` (urutan yang caller tentukan), BUKAN
  // columns.filter() — filter mempertahankan urutan deklarasi `columns`
  // aslinya, mengabaikan urutan yang diminta caller lewat `mobileFields`,
  // jadi field pertama yang caller inginkan (mis. nama customer) tidak
  // benar-benar jadi judul kalau kolomnya dideklarasikan belakangan.
  const [titleField, ...restFields] = mobileFields
    .map((field) => columns.find((col) => col.field === field))
    .filter((col): col is GridColDef => Boolean(col));
  const actionsCol = columns.find((col) => col.field === '_actions');

  const makeCellParams = (col: GridColDef) =>
    ({
      row,
      value: row[col.field],
      field: col.field,
      colDef: col,
      cellMode: 'view',
      hasFocus: false,
      tabIndex: -1,
      formattedValue: formatColumnValue(row, col),
    }) as unknown as GridRenderCellParams<Record<string, unknown>, Record<string, unknown>>;

  if (!titleField) return null;

  return (
    <Accordion
      expanded={expandState.expanded}
      onChange={expandState.onToggle}
      disableGutters
      square={false}
      sx={{
        mb: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        overflow: 'hidden',
        '&:before': { display: 'none' },
      }}
    >
      {/* Box relative WAJIB membungkus AccordionSummary — root MUI-nya render
          sebagai elemen <button> asli. Kalau actionsCol (IconButton/ActionMenu,
          juga <button>) ditaruh SEBAGAI ANAK AccordionSummary, hasilnya
          <button> bersarang di <button> — HTML invalid, React warning
          hydration, dan browser diam-diam merestrukturisasi DOM (klik action
          jadi tidak reliable). Actions HARUS jadi sibling yang diposisikan
          absolute di atasnya, bukan anak. */}
      <Box sx={{ position: 'relative' }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            '& .MuiAccordionSummary-content': {
              minWidth: 0,
              overflow: 'hidden',
              alignItems: 'center',
              // Sisakan ruang di kanan biar teks judul tidak ketiban actions
              // yang di-absolute-position di atasnya.
              pr: actionsCol?.renderCell ? 5 : 0,
            },
          }}
        >
          {titleField.renderCell ? (
            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>{titleField.renderCell(makeCellParams(titleField))}</Box>
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatColumnValue(row, titleField)}
            </Typography>
          )}
        </AccordionSummary>
        {actionsCol?.renderCell && (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ position: 'absolute', top: '50%', right: 40, transform: 'translateY(-50%)' }}
          >
            {actionsCol.renderCell(makeCellParams(actionsCol))}
          </Box>
        )}
      </Box>
      <AccordionDetails sx={{ pt: 0 }}>
        {restFields.map((col, idx) => (
          // minWidth:0 WAJIB di container field — default flex item punya min-width:auto
          // (ikut lebar konten, TIDAK bisa menyusut di bawah itu), jadi teks panjang tanpa
          // spasi (mis. entity_key/URL/ID teknis) mendorong Box ini lebih lebar dari Card,
          // keluar dari batas card. minWidth:0 izinkan Box menyusut penuh ke lebar parent,
          // baru wordBreak di bawah bisa benar-benar efektif membungkus teksnya.
          <Box key={col.field} sx={{ minWidth: 0 }}>
            {idx > 0 && <Divider sx={{ my: 1 }} />}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.25 }}
              >
                {col.headerName ?? col.field}
              </Typography>
              {col.renderCell ? (
                <Box sx={{ minHeight: 32, display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                  {col.renderCell(makeCellParams(col))}
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  {formatColumnValue(row, col)}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        {onRowClick && (
          <Box
            onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
            sx={{
              mt: restFields.length > 0 ? 1.5 : 0,
              pt: restFields.length > 0 ? 1.5 : 0,
              borderTop: restFields.length > 0 ? '1px solid' : 'none',
              borderColor: 'divider',
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            {t('common.viewDetailOf', { title: formatColumnValue(row, titleField) })}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ─── ResponsiveListView ───────────────────────────────────────────────────────

export function ResponsiveListView({
  rows,
  columns,
  renderCard,
  onRowClick,
  loading = false,
  error = null,
  emptyMessage,
  title,
  pageSize = 10,
  height = 400,
  getRowHeight,
  mobileFields,
  rowCount,
  paginationMode,
  sortingMode,
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  pageSizeOptions = [5, 10, 20, 50],
}: ResponsiveListViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  // 'md' (900px, bukan 'sm'/600px) — tablet portrait (mis. iPad ~768-820px logical
  // width) masih di atas 600px tapi tabel DataGrid multi-kolom tetap tidak muat
  // tanpa scroll horizontal yang canggung. Sama dengan breakpoint yang sudah
  // dipakai DashboardLayout untuk switch sidebar temporary/permanent.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Accordion exclusive terpusat (satu sumber untuk AutoCard maupun renderCard
  // custom) — buka card lain otomatis nutup yang sebelumnya, bukan tiap
  // pemakai bikin `useState` sendiri (lihat `CardExpandState`).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const makeExpandState = (rowId: string): CardExpandState => ({
    expanded: expandedId === rowId,
    onToggle: () => setExpandedId((cur) => (cur === rowId ? null : rowId)),
  });

  // Bug KRITIS (2026-08-22, user: crash mobile "A problem repeatedly
  // occurred" — Safari kehabisan memori) — cabang mobile di bawah dulu
  // me-render SEMUA `rows` sekaligus jadi Accordion (beda dari cabang
  // desktop yang lewat MUI DataGrid, otomatis dipaginasi via `pageSize`).
  // Untuk tabel besar (mis. breakdown Expansion, ribuan baris client-side)
  // ini merender ribuan komponen Accordion+Chip sekaligus — cukup untuk
  // meng-crash tab mobile berulang kali. Paginasi CLIENT ditambahkan di
  // sini, mirror `pageSize` yang SUDAH diterima komponen ini tapi
  // sebelumnya diam-diam diabaikan di jalur mobile. Server-mode (`rows`
  // sudah 1 halaman dari API) SENGAJA dilewati — datanya sudah kecil,
  // paginasi ganda di sini malah salah (motong ulang hasil yang sudah
  // dipotong server).
  const isServerPaginated = paginationMode === 'server';
  const [mobilePage, setMobilePage] = useState(0);
  const mobileTotalPages = isServerPaginated ? 1 : Math.max(1, Math.ceil(rows.length / pageSize));
  // Reset ke halaman 1 begitu data berubah (search/sort/filter baru bisa
  // bikin halaman sekarang jadi kosong/di luar jangkauan) — bukan cuma
  // begitu rows.length berubah, karena isi rows bisa berubah TOTAL
  // (mis. ganti sort) walau panjangnya kebetulan sama.
  useEffect(() => {
    setMobilePage(0);
  }, [rows]);
  const visibleRows = isServerPaginated
    ? rows
    : rows.slice(mobilePage * pageSize, (mobilePage + 1) * pageSize);

  const effectiveMobileFields =
    mobileFields ?? columns.filter((c) => c.headerName).map((c) => c.field);

  if (loading) {
    return (
      <Box>
        {isMobile ? (
          <Box>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={120}
                sx={{ mb: 1.5, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : (
          <Skeleton variant="rectangular" height={typeof height === 'number' ? height : 400} sx={{ borderRadius: 1 }} />
        )}
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{getApiErrorMessage(error, t)}</Alert>;
  }

  if (!rows.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.disabled">
          {emptyMessage ?? t('common.noData')}
        </Typography>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Box>
        {title && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            {t('common.titleWithItemCount', { title, count: rows.length })}
          </Typography>
        )}
        {visibleRows.map((row, idx) => {
          const rowId = String((row as Record<string, unknown>).id ?? idx);
          return renderCard ? (
            renderCard(row as Record<string, unknown>, idx, makeExpandState(rowId))
          ) : (
            <AutoCard
              key={rowId}
              row={row as Record<string, unknown>}
              columns={columns}
              mobileFields={effectiveMobileFields}
              onRowClick={onRowClick}
              expandState={makeExpandState(rowId)}
            />
          );
        })}
        {!isServerPaginated && mobileTotalPages > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
            <IconButton
              size="small"
              disabled={mobilePage === 0}
              onClick={() => setMobilePage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {t('common.pageOf', { page: mobilePage + 1, total: mobileTotalPages })}
            </Typography>
            <IconButton
              size="small"
              disabled={mobilePage >= mobileTotalPages - 1}
              onClick={() => setMobilePage((p) => Math.min(mobileTotalPages - 1, p + 1))}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Card sx={{ overflow: 'hidden' }}>
      {title && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {title}
          </Typography>
        </Box>
      )}

      <Box sx={{ height }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowHeight={getRowHeight === 'auto' ? () => 'auto' as const : undefined}
          onRowClick={onRowClick ? ({ row }) => onRowClick(row as Record<string, unknown>) : undefined}
          initialState={
            paginationModel ? undefined : {
              pagination: { paginationModel: { pageSize } },
            }
          }
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          rowCount={rowCount}
          paginationMode={paginationMode}
          sortingMode={sortingMode}
          sortModel={sortModel}
          onSortModelChange={onSortModelChange}
          pageSizeOptions={pageSizeOptions}
          disableRowSelectionOnClick
          disableColumnMenu
          sx={{
            border: 'none',
            borderRadius: 0,
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'action.hover',
              borderRadius: 0,
            },
            '& .MuiDataGrid-columnHeader': {
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'action.hover',
              cursor: onRowClick ? 'pointer' : 'default',
            },
            '& .MuiDataGrid-cell': {
              fontSize: '0.8125rem',
              borderBottom: '1px solid',
              borderColor: 'divider',
              // Cell default MUI DataGrid = display:block - teks polos numpang
              // baseline garis teks, tapi elemen inline-flex (Chip/badge dari
              // renderCell custom) tidak ikut center otomatis, jadi posisinya
              // beda dgn sel teks di baris yang sama (baris kelihatan "naik
              // turun" tiap kali ada Chip). Paksa flex+center di level cell.
              display: 'flex',
              alignItems: 'center',
            },
            // Kolom yang isinya LIST beberapa chip (bisa wrap 2+ baris, mis.
            // "categories_bought"/"missing_high_margin_categories" di tab Target
            // Upsell) HARUS tetap rata atas, bukan center - kalau di-center,
            // konten yang lebih tinggi dari row (52px) meluber ke ATAS *dan*
            // BAWAH sekaligus, numpuk ke baris tetangga di kedua arah. Ditandai
            // via cellClassName: 'wrap-chips-cell' di GridColDef masing-masing.
            '& .MuiDataGrid-cell.wrap-chips-cell': {
              alignItems: 'flex-start',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-virtualScroller': {
              bgcolor: 'background.paper',
            },
          }}
        />
      </Box>
    </Card>
  );
}