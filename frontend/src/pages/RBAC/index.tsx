import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, StatusChip } from '@/components/ui';
import { DataTable } from '@/components/tables/DataTable';
import {
  useRbacRoles,
  useRbacPermissions,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useUpdateRolePermissionsMutation,
} from '@/hooks/useRbac';
import type { Role, Permission } from '@/types/rbac';

// ─── Action columns ───────────────────────────────────────────────────────────

const ACTION_COLUMNS = [
  { key: 'menu',   label: 'Menu' },
  { key: 'view',   label: 'View' },
  { key: 'input',  label: 'Input' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

// ─── Mobile Role Card ─────────────────────────────────────────────────────────

interface RoleCardProps {
  role: Role;
  onPermissions: (role: Role) => void;
  onDelete: (role: Role) => void;
  t: (key: string) => string;
}

function RoleCard({ role, onPermissions, onDelete, t }: RoleCardProps) {
  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 1.5 }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Name + system badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
            {role.name}
          </Typography>
          {role.is_system && (
            <StatusChip
              label={t('rbac.systemRole')}
              color="warning"
              icon={<LockIcon />}
            />
          )}
        </Box>

        {/* Description */}
        {role.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {role.description}
          </Typography>
        )}

        {/* Permission count */}
        <StatusChip
          label={`${role.permissions.length} permission`}
          color="primary"
        />
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 1.5, gap: 1 }}>
        <Button
          size="small"
          startIcon={<SecurityIcon sx={{ fontSize: 15 }} />}
          onClick={() => onPermissions(role)}
          sx={{ flex: 1 }}
        >
          {t('rbac.assignPermissions')}
        </Button>
        <Tooltip title={role.is_system ? t('rbac.cannotDeleteSystem') : t('common.delete')}>
          <span>
            <IconButton
              size="small"
              color="error"
              disabled={role.is_system}
              onClick={() => onDelete(role)}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RBAC() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [permSearch, setPermSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activePermIds, setActivePermIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (selectedRole) {
      setActivePermIds(new Set(selectedRole.permissions.map((p) => p.id)));
    }
  }, [selectedRole]);

  // ─── Queries ─────────────────────────────────────────────────────────────────

  const { data: roles, isLoading: rolesLoading, error: rolesError } = useRbacRoles();

  const { data: permissionsGrouped } = useRbacPermissions(permDialogOpen);

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useCreateRoleMutation(() => {
    setAddDialogOpen(false);
    setFormData({ name: '', description: '' });
  });

  const deleteMutation = useDeleteRoleMutation(() => {
    setDeleteDialogOpen(false);
    setSelectedRole(null);
  });

  const updatePermissionsMutation = useUpdateRolePermissionsMutation(
    (updatedRole) => setSelectedRole(updatedRole),
    () => {
      if (selectedRole) {
        setActivePermIds(new Set(selectedRole.permissions.map((p) => p.id)));
      }
    }
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const findPerm = useCallback(
    (group: string, action: string) => {
      if (!permissionsGrouped) return undefined;
      return Object.values(permissionsGrouped)
        .flat()
        .find((p) => p.group_name === group && p.name.endsWith(`:${action}`));
    },
    [permissionsGrouped]
  );

  const hasPermission = (group: string, action: string): boolean => {
    const perm = findPerm(group, action);
    if (!perm) return false;
    return activePermIds.has(perm.id);
  };

  const groupHasAction = (group: string, action: string): boolean => {
    if (!permissionsGrouped) return false;
    return Object.values(permissionsGrouped)
      .flat()
      .some((p) => p.group_name === group && p.name.endsWith(`:${action}`));
  };

  const getGroupActiveCount = (group: string): number =>
    ACTION_COLUMNS.filter((col) => groupHasAction(group, col.key) && hasPermission(group, col.key)).length;

  const getGroupTotalCount = (group: string): number =>
    ACTION_COLUMNS.filter((col) => groupHasAction(group, col.key)).length;

  const handlePermissionToggle = (group: string, action: string) => {
    if (!selectedRole) return;
    const perm = findPerm(group, action);
    if (!perm) return;
    const newIds = new Set(activePermIds);
    if (newIds.has(perm.id)) newIds.delete(perm.id);
    else newIds.add(perm.id);
    setActivePermIds(newIds);
    updatePermissionsMutation.mutate({ id: selectedRole.id, permission_ids: Array.from(newIds) });
  };

  const toggleGroupExpand = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const openPermDialog = (role: Role) => {
    setSelectedRole(role);
    setPermSearch('');
    setExpandedGroups(new Set());
    setPermDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  // ─── DataTable columns (desktop only) ────────────────────────────────────────

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
          label={`${(params.value as Permission[]).length} permission`}
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
          <Tooltip title={t('rbac.assignPermissions')}>
            <IconButton size="small" color="primary" onClick={() => openPermDialog(params.row as Role)}>
              <SecurityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
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
        </Box>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (rolesLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        {isMobile ? (
          <Box sx={{ mt: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={110} sx={{ mb: 1.5, borderRadius: 2 }} />
            ))}
          </Box>
        ) : (
          <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
        )}
      </Box>
    );
  }

  if (rolesError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{t('error.generic')}</Alert>
      </Box>
    );
  }

  const filteredGroups = Object.keys(permissionsGrouped ?? {}).filter(
    (g) => !permSearch || g.toLowerCase().includes(permSearch.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('rbac.title')}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => { setFormData({ name: '', description: '' }); setAddDialogOpen(true); }}
        >
          {isMobile ? t('common.add') : t('rbac.addRole')}
        </Button>
      </Box>

      {/* Role List: Mobile = Cards, Desktop = DataTable */}
      {isMobile ? (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            {roles?.length ?? 0} role ditemukan
          </Typography>
          {(roles ?? []).map((role) => (
            <RoleCard key={role.id} role={role} onPermissions={openPermDialog} onDelete={openDeleteDialog} t={t} />
          ))}
          {(roles ?? []).length === 0 && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">{t('common.noData')}</Typography>
            </Box>
          )}
        </Box>
      ) : (
        <DataTable title={t('rbac.roles')} rows={roles ?? []} columns={columns} height={450} pageSize={10} />
      )}

      {/* DIALOG: Add Role */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title={t('rbac.addRole')}
        maxWidth="sm"
        error={createMutation.error}
        actions={[
          { label: t('common.cancel'), onClick: () => setAddDialogOpen(false), variant: 'text' },
          { label: t('common.add'), onClick: () => createMutation.mutate(formData), isLoading: createMutation.isPending, disabled: !formData.name.trim() },
        ]}
      >
        <TextField autoFocus margin="dense" label={t('rbac.roleName')} fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <TextField margin="dense" label={t('rbac.roleDesc')} fullWidth multiline rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </Dialog>

      {/* DIALOG: Delete Role */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title={t('rbac.deleteRole')}
        maxWidth="xs"
        error={deleteMutation.error}
        actions={[
          { label: t('common.cancel'), onClick: () => setDeleteDialogOpen(false), variant: 'text' },
          { label: t('common.delete'), onClick: () => selectedRole && deleteMutation.mutate(selectedRole.id), color: 'error', isLoading: deleteMutation.isPending },
        ]}
      >
        <Typography>{t('rbac.deleteRoleConfirm')}</Typography>
        {selectedRole && (
          <Paper sx={{ p: 1.5, mt: 1.5, border: '1px solid', borderColor: 'error.light' }} elevation={0}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRole.name}</Typography>
            <Typography variant="caption" color="text.secondary">{selectedRole.description}</Typography>
          </Paper>
        )}
      </Dialog>

      {/* DIALOG: Set Permission */}
      <Dialog
        open={permDialogOpen}
        onClose={() => setPermDialogOpen(false)}
        fullScreen={isMobile}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 0.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SecurityIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                Set Permission
              </Typography>
              {selectedRole && (
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                  Role:&nbsp;
                  <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{selectedRole.name}</Box>
                </Typography>
              )}
            </Box>
            <StatusChip label={`${activePermIds.size} aktif`} color="primary" />
          </Box>
        }
        maxWidth="sm"
        contentSx={{ p: 0 }}
        actions={[{ label: 'Selesai', onClick: () => setPermDialogOpen(false) }]}
      >
        {/* Search bar */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Filter kategori..."
            fullWidth
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {/* Accordion List */}
        <Box sx={{ overflowY: 'auto', maxHeight: isMobile ? 'calc(100vh - 220px)' : '60vh' }}>
          <List disablePadding>
            {filteredGroups.map((group, idx) => {
              const isOpen = expandedGroups.has(group);
              const activeCount = getGroupActiveCount(group);
              const totalCount = getGroupTotalCount(group);
              const isFullyActive = activeCount === totalCount && totalCount > 0;

              return (
                <Box key={group}>
                  {idx > 0 && <Divider />}

                  <ListItemButton
                    onClick={() => toggleGroupExpand(group)}
                    sx={{
                      px: 2.5, py: 1.25, gap: 1.5,
                      bgcolor: isOpen ? 'primary.main' : 'transparent',
                      '&:hover': { bgcolor: isOpen ? 'primary.dark' : 'action.hover' },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600, color: isOpen ? '#fff' : 'text.primary' }}>
                          {group}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {activeCount > 0 && (
                        <StatusChip
                          label={`${activeCount}/${totalCount}`}
                          color={isFullyActive ? 'success' : 'warning'}
                          sx={isOpen ? { bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', borderColor: 'transparent' } : undefined}
                        />
                      )}
                    </Box>
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 20,
                        color: isOpen ? '#fff' : 'text.secondary',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        flexShrink: 0,
                      }}
                    />
                  </ListItemButton>

                  <Collapse in={isOpen} unmountOnExit>
                    <Box sx={{ bgcolor: 'action.hover', px: 2.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.25, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                      {ACTION_COLUMNS.map((col) => {
                        const exists = groupHasAction(group, col.key);
                        const checked = hasPermission(group, col.key);
                        return (
                          <Box
                            key={col.key}
                            sx={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              py: 0.75, px: 1, borderRadius: 1,
                              opacity: exists ? 1 : 0.38,
                              bgcolor: checked && exists ? 'primary.main' + '14' : 'transparent',
                              transition: 'background-color 0.15s',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: checked && exists ? 'primary.main' : 'divider', transition: 'background-color 0.15s', flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ fontWeight: checked && exists ? 600 : 400, color: checked && exists ? 'primary.main' : 'text.primary' }}>
                                {col.label}
                              </Typography>
                              {!exists && (
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                                  (tidak tersedia)
                                </Typography>
                              )}
                            </Box>
                            <Switch checked={checked} onChange={() => exists && handlePermissionToggle(group, col.key)} disabled={!exists} size="small" color="primary" />
                          </Box>
                        );
                      })}
                    </Box>
                    <Divider />
                  </Collapse>
                </Box>
              );
            })}
          </List>

          {filteredGroups.length === 0 && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">Tidak ada kategori yang cocok</Typography>
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
