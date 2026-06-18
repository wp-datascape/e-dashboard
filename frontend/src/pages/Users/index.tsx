// frontend/src/pages/Users/index.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import {
  useUsers,
  useCompanies,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/useUsers';
import { rbacApi } from '@/api/rbac.api';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types/users';

// Components
import { ViewUserDialog } from './components/ViewUserDialog';
import { CreateUserDialog } from './components/CreateUserDialog';
import { EditUserDialog } from './components/EditUserDialog';
import { DeleteUserDialog } from './components/DeleteUserDialog';

// ─── Types ───────────────────────────────────────────────────────────────────

type DialogMode = 'create' | 'edit' | 'view' | 'delete' | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRoleColor = (roleName: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    superadmin: 'error',
    admin: 'warning',
    manager: 'primary',
    sales: 'info',
    executive: 'success',
  };
  return map[roleName] ?? 'default';
};

const fmtDate = (iso: string | null, fallback: string): string => {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Users() {
  const { t } = useTranslation();

  // ── State ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // ── Data ──
  const { data: users = [], isLoading } = useUsers();
  const { data: companies = [] } = useCompanies();
  const { data: roles = [] } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: () => rbacApi.getRoles(),
  });

  // ── Mutations ──
  const { mutate: createUser, isPending: isCreating, error: createError, reset: resetCreate } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting, error: deleteError, reset: resetDelete } = useDeleteUser();

  // ── Dialog handlers ──
  const closeDialog = () => {
    setDialogMode(null);
    resetCreate();
    resetUpdate();
    resetDelete();
  };

  const openCreate = () => {
    resetCreate();
    setDialogMode('create');
  };

  const openMenuAction = (mode: DialogMode) => {
    setDialogMode(mode);
    setMenuAnchor(null);
  };

  // ── Submit handlers ──
  const onCreateSubmit = (payload: CreateUserPayload) => {
    createUser(payload, { onSuccess: closeDialog });
  };

  const onEditSubmit = (payload: UpdateUserPayload) => {
    if (!selectedUser) return;
    updateUser(
      { id: selectedUser.id, payload },
      { onSuccess: closeDialog },
    );
  };

  const onDeleteConfirm = () => {
    if (!selectedUser) return;
    deleteUser(selectedUser.id, {
      onSuccess: () => {
        closeDialog();
        setSelectedUser(null);
      },
    });
  };

  // ── DataGrid columns ──
  const columns: GridColDef[] = [
    { field: 'name', headerName: t('users.name'), flex: 1, minWidth: 160 },
    { field: 'email', headerName: t('users.email'), flex: 1, minWidth: 200 },
    {
      field: 'roles',
      headerName: t('users.role'),
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
          {(params.row as User).roles.map(r => (
            <StatusChip key={r.id} label={r.name} color={getRoleColor(r.name)} />
          ))}
        </Box>
      ),
    },
    {
      field: 'companies',
      headerName: t('users.companies'),
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {(params.row as User).companies.map(c => (
            <StatusChip key={c.id} label={c.code} color="default" />
          ))}
        </Box>
      ),
    },
    {
      field: 'is_active',
      headerName: t('common.status'),
      width: 105,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <StatusChip
            label={params.value ? t('common.active') : t('common.inactive')}
            color={params.value ? 'success' : 'default'}
          />
        </Box>
      ),
    },
    {
      field: 'last_login_at',
      headerName: t('users.lastLogin'),
      width: 145,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
              {fmtDate(params.row.last_login_at as string | null, t('users.noLastLogin'))}
            </Typography>
        </Box>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 56,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
              setSelectedUser(params.row as User);
            }}
            aria-label={t('common.actions')}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('users.title')}
        </Typography>
        <Button startIcon={<PersonAddIcon />} onClick={openCreate}>
          {t('users.addUser')}
        </Button>
      </Box>

      {/* ── Table ── */}
      {isLoading ? (
        <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 1 }} />
      ) : (
        <DataTable rows={users} columns={columns} height={560} />
      )}

      {/* ── Action Menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 180 } } }}
      >
        <MenuItem onClick={() => openMenuAction('view')} dense>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t('users.viewUser')} />
        </MenuItem>
        <MenuItem onClick={() => { resetUpdate(); openMenuAction('edit'); }} dense>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t('users.editUser')} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { resetDelete(); openMenuAction('delete'); }}
          dense
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t('users.deleteUser')} />
        </MenuItem>
      </Menu>

      {/* ── Dialogs ── */}
      <ViewUserDialog
        open={dialogMode === 'view'}
        onClose={closeDialog}
        user={selectedUser}
      />

      <CreateUserDialog
        open={dialogMode === 'create'}
        onClose={closeDialog}
        onSubmit={onCreateSubmit}
        isPending={isCreating}
        error={createError}
        roles={roles}
        companies={companies}
      />

      <EditUserDialog
        open={dialogMode === 'edit'}
        onClose={closeDialog}
        onSubmit={onEditSubmit}
        isPending={isUpdating}
        error={updateError}
        user={selectedUser}
        roles={roles}
        companies={companies}
      />

      <DeleteUserDialog
        open={dialogMode === 'delete'}
        onClose={closeDialog}
        onConfirm={onDeleteConfirm}
        isPending={isDeleting}
        error={deleteError}
        user={selectedUser}
      />
    </Box>
  );
}
