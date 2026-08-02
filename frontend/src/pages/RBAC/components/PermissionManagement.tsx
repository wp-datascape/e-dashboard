
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTheme } from '@mui/material/styles';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { Button, StatusChip } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import type { Permission } from '@/types/rbac';

interface PermissionManagementProps {
  permissions: Permission[];
  onCreateClick: () => void;
  onEditClick: (permission: Permission) => void;
  onDeleteClick: (permission: Permission) => void;
  isLoading?: boolean;
}

export function PermissionManagement({
  permissions,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  isLoading = false,
}: PermissionManagementProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const mono = theme.typography.caption.fontFamily;

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('rbac.permission_name'),
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: mono }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'category',
      headerName: t('rbac.category'),
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <StatusChip
          label={params.value || t('rbac.uncategorized')}
          color="info"
        />
      ),
    },
    {
      field: 'description',
      headerName: t('rbac.description'),
      flex: 2,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '—'}
        </Typography>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 100,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEditClick(params.row as Permission)}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={() => onDeleteClick(params.row as Permission)}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('rbac.permissions')}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={onCreateClick}
          mobileIconOnly
        >
          {t('rbac.add_permission')}
        </Button>
      </Box>

      {/* Permission List */}
      <ResponsiveListView
        rows={permissions ?? []}
        columns={columns}
        loading={isLoading}
        error={null}
        title={t('rbac.permissions')}
        pageSize={15}
        height={500}
        mobileFields={['name', 'category', 'description']}
      />
    </Box>
  );
}