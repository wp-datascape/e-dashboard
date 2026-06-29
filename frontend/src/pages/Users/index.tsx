// frontend/src/pages/Users/index.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Button, StatusChip, ActionMenu } from '@/components/ui';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import { useRoles } from '@/hooks/useRoles';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types/users';

import { useCan } from '@/hooks/useCan';
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

const isSystemUser = (user: User): boolean =>
  user.roles?.some(r => r.is_system) ?? false;

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
  const can = useCan();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useUsers();
  const { data: companies = [] } = useCompanies();
  const { data: roles = [] } = useRoles();

  const { mutate: createUser, isPending: isCreating, error: createError, reset: resetCreate } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting, error: deleteError, reset: resetDelete } = useDeleteUser();

  const closeDialog = () => {
    setDialogMode(null);
    resetCreate();
    resetUpdate();
    resetDelete();
  };

  const onCreateSubmit = (payload: CreateUserPayload) => {
    createUser(payload, { onSuccess: closeDialog });
  };

  const onEditSubmit = (payload: UpdateUserPayload) => {
    if (!selectedUser) return;
    updateUser({ id: selectedUser.id, payload }, { onSuccess: closeDialog });
  };

  const onDeleteConfirm = () => {
    if (!selectedUser) return;
    deleteUser(selectedUser.id, { onSuccess: () => { closeDialog(); setSelectedUser(null); } });
  };

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
          {((params.row as User).roles ?? []).map(r => (
            <StatusChip key={r.id} label={r.name} color={getRoleColor(r.name)} icon={r.is_system ? <LockIcon /> : undefined} />
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
          {((params.row as User).companies ?? []).map(c => (
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
      width: 110,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const user = params.row as User;
        return (
          <ActionMenu
            items={[
              { label: t('users.viewUser'), icon: <VisibilityIcon />, onClick: () => { setSelectedUser(user); setDialogMode('view'); } },
              { label: t('users.editUser'), icon: <EditIcon />, onClick: () => { resetUpdate(); setSelectedUser(user); setDialogMode('edit'); }, hidden: !can('access.user:update') },
              { label: t('users.deleteUser'), icon: <DeleteIcon />, onClick: () => { resetDelete(); setSelectedUser(user); setDialogMode('delete'); }, color: 'error', dividerBefore: true, hidden: isSystemUser(user) || !can('access.user:delete') },
            ]}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('users.title')}
        </Typography>
        {can('access.user:create') && (
          <Button startIcon={<PersonAddIcon />} onClick={() => { resetCreate(); setDialogMode('create'); }} mobileIconOnly>
            {t('users.addUser')}
          </Button>
        )}
      </Box>

      <ResponsiveListView rows={users} columns={columns} loading={isLoading} height={560} />

      <ViewUserDialog open={dialogMode === 'view'} onClose={closeDialog} user={selectedUser} />
      <CreateUserDialog open={dialogMode === 'create'} onClose={closeDialog} onSubmit={onCreateSubmit} isPending={isCreating} error={createError} roles={roles} companies={companies} />
      <EditUserDialog open={dialogMode === 'edit'} onClose={closeDialog} onSubmit={onEditSubmit} isPending={isUpdating} error={updateError} user={selectedUser} roles={roles} companies={companies} />
      <DeleteUserDialog open={dialogMode === 'delete'} onClose={closeDialog} onConfirm={onDeleteConfirm} isPending={isDeleting} error={deleteError} user={selectedUser} />
    </Box>
  );
}
