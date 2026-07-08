// frontend/src/components/tables/ResponsiveListView/ResponsiveListView.tsx
import { type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
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

export interface ResponsiveListViewProps {
  /** Row data */
  rows: GridRowsProp;
  /** Column definitions (same format as DataGrid) */
  columns: GridColDef[];
  /** Optional custom card renderer for mobile view */
  renderCard?: (row: Record<string, unknown>, index: number) => ReactNode;
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
}: {
  row: Record<string, unknown>;
  columns: GridColDef[];
  mobileFields: string[];
  onRowClick?: (row: Record<string, unknown>) => void;
}) {
  const fields = columns.filter(
    (col) => col.field && mobileFields.includes(col.field),
  );
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

  return (
    <Card
      sx={{
        mb: 1.5,
        cursor: onRowClick ? 'pointer' : 'default',
        '&:hover': onRowClick ? { borderColor: 'primary.light' } : undefined,
      }}
      onClick={() => onRowClick?.(row)}
    >
      <Box sx={{ p: 2 }}>
        {actionsCol?.renderCell && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            {actionsCol.renderCell(makeCellParams(actionsCol))}
          </Box>
        )}
        {fields.map((col, idx) => (
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
      </Box>
    </Card>
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
        {rows.map((row, idx) =>
          renderCard ? (
            renderCard(row as Record<string, unknown>, idx)
          ) : (
            <AutoCard
              key={String((row as Record<string, unknown>).id ?? idx)}
              row={row as Record<string, unknown>}
              columns={columns}
              mobileFields={effectiveMobileFields}
              onRowClick={onRowClick}
            />
          ),
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