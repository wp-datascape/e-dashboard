import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridRowsProp } from '@mui/x-data-grid';

export interface DataTableProps {
  title?: string;
  rows: GridRowsProp;
  columns: GridColDef[];
  pageSize?: number;
  height?: number;
  loading?: boolean;
}

export const DataTable = ({
  title,
  rows,
  columns,
  pageSize = 10,
  height = 400,
  loading = false,
}: DataTableProps) => {
  return (
    <Paper
      elevation={0}
      square
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {title && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      )}

      <Box sx={{ height }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: { paginationModel: { pageSize } },
          }}
          pageSizeOptions={[5, 10, 20, 50]}
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
    </Paper>
  );
};
