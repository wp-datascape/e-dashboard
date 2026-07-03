import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { Button, StatusChip } from '@/components/ui';
import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { useCan } from '@/hooks/useCan';
import {
  useRbacRoles,
  useRbacPermissions,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useUpdateRolePermissionsMutation,
} from '@/hooks/useRbac';
import type { Role, Permission, CreateRolePayload } from '@/types/rbac';

// Components
import { RoleCard } from './components/RoleCard';
import { AddRoleDialog } from './components/AddRoleDialog';
import { DeleteRoleDialog } from './components/DeleteRoleDialog';
import { SetPermissionDialog } from './components/SetPermissionDialog';

// ─── Component ────────────────────────────────────────────────────────────────

export default function RBAC() {
  const { t } = useTranslation();
  const can = useCan();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────────

  const { data: roles, isLoading: rolesLoading, error: rolesError } = useRbacRoles();
  const { data: permissionsGrouped } = useRbacPermissions(permDialogOpen);

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useCreateRoleMutation(() => {
    setAddDialogOpen(false);
  });

  const deleteMutation = useDeleteRoleMutation(() => {
    setDeleteDialogOpen(false);
    setSelectedRole(null);
  });

  const updatePermissionsMutation = useUpdateRolePermissionsMutation(
    (updatedRole) => setSelectedRole(updatedRole)
  );

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleCreateRole = (data: CreateRolePayload) => {
    createMutation.mutate(data);
  };

  const handleDeleteConfirm = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleTogglePermission = (_group: string, _action: string, currentIds: Set<number>) => {
    if (!selectedRole) return;
    updatePermissionsMutation.mutate({ id: selectedRole.id, permission_ids: Array.from(currentIds) });
  };

  const openPermDialog = (role: Role) => {
    setSelectedRole(role);
    setPermDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  // ─── Columns (desktop DataGrid) ──────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('rbac.roleName'),
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.value}
          </Typography>
          {params.row.is_system && (
            <StatusChip
              label={t('rbac.systemRole')}
              color="warning"
              icon={<LockIcon />}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'description',
      headerName: t('rbac.roleDesc'),
      flex: 2,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'permissions',
      headerName: t('rbac.permissions'),
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusChip
          label={t('rbac.permissionCount', { count: ((params.value as Permission[]) ?? []).length })}
          color="primary"
        />
      ),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 110,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {(can('access.permission:view') || can('access.permission:update')) && (
            <Tooltip title={t('rbac.assignPermissions')}>
              <IconButton size="small" color="primary" onClick={() => openPermDialog(params.row as Role)}>
                <SecurityIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {can('access.role:delete') && (
            <Tooltip title={params.row.is_system ? t('rbac.cannotDeleteSystem') : t('common.delete')}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={params.row.is_system}
                  onClick={() => openDeleteDialog(params.row as Role)}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('rbac.title')}
        </Typography>
        {can('access.role:create') && (
          <Button startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)} mobileIconOnly>
            {t('rbac.addRole')}
          </Button>
        )}
      </Box>

      {/* Role List: Responsive — Desktop DataGrid / Mobile Cards */}
      <ResponsiveListView
        rows={roles ?? []}
        columns={columns}
        loading={rolesLoading}
        error={rolesError as Error | null}
        title={t('rbac.roles')}
        pageSize={10}
        height={450}
        renderCard={(row, _idx) => (
          <RoleCard
            key={_idx}
            role={row as unknown as Role}
            onPermissions={openPermDialog}
            onDelete={openDeleteDialog}
            canManagePermissions={can('access.permission:view') || can('access.permission:update')}
            canDelete={can('access.role:delete')}
          />
        )}
        mobileFields={['name', 'description', 'permissions']}
      />

      {/* DIALOGS */}
      <AddRoleDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleCreateRole}
        isPending={createMutation.isPending}
        error={createMutation.error}
      />

      <DeleteRoleDialog
        key={`delete-${selectedRole?.id ?? 'none'}`}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        role={selectedRole}
      />

      <SetPermissionDialog
        key={`perm-${selectedRole?.id ?? 'none'}`}
        open={permDialogOpen}
        onClose={() => setPermDialogOpen(false)}
        role={selectedRole}
        permissionsGrouped={permissionsGrouped ?? null}
        onTogglePermission={handleTogglePermission}
        readOnly={!can('access.permission:update')}
        isMobile={false}
      />
    </Box>
  );
}
