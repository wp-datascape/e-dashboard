import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
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
import { Button, Dialog } from '@/components/ui';
import { DataTable } from '@/components/tables/DataTable';
import { rbacApi } from '@/api/rbac.api';
import type { Role, Permission } from '@/types/rbac';

// ─── Action columns ───────────────────────────────────────────────────────────

const ACTION_COLUMNS = [
  { key: 'menu',   label: 'Menu' },
  { key: 'view',   label: 'View' },
  { key: 'input',  label: 'Input' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RBAC() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [permSearch, setPermSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ─── Optimistic permission state ─────────────────────────────────────────────
  const [activePermIds, setActivePermIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (selectedRole) {
      setActivePermIds(new Set(selectedRole.permissions.map((p) => p.id)));
    }
  }, [selectedRole]);

  // ─── Queries ─────────────────────────────────────────────────────────────────

  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: rbacApi.getRoles,
  });

  const { data: permissionsGrouped } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: rbacApi.getPermissions,
    enabled: permDialogOpen,
  });

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: rbacApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setAddDialogOpen(false);
      setFormData({ name: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setDeleteDialogOpen(false);
      setSelectedRole(null);
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permission_ids }: { id: number; permission_ids: number[] }) =>
      rbacApi.updateRolePermissions(id, { permission_ids }),
    onSuccess: (updatedRole: Role) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setSelectedRole(updatedRole);
    },
    onError: () => {
      if (selectedRole) {
        setActivePermIds(new Set(selectedRole.permissions.map((p) => p.id)));
      }
    },
  });

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
    if (newIds.has(perm.id)) {
      newIds.delete(perm.id);
    } else {
      newIds.add(perm.id);
    }
    setActivePermIds(newIds);

    updatePermissionsMutation.mutate({
      id: selectedRole.id,
      permission_ids: Array.from(newIds),
    });
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

  // ─── DataTable columns ────────────────────────────────────────────────────────

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
            <Chip
              label={t('rbac.systemRole')}
              size="small"
              icon={<LockIcon sx={{ fontSize: '10px !important' }} />}
              sx={{ height: 18, fontSize: '0.6rem', borderRadius: 0 }}
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
        <Chip
          label={`${(params.value as Permission[]).length} permission`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.65rem', borderRadius: 0 }}
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
                onClick={() => {
                  setSelectedRole(params.row as Role);
                  setDeleteDialogOpen(true);
                }}
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
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
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
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('rbac.title')}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => {
            setFormData({ name: '', description: '' });
            setAddDialogOpen(true);
          }}
        >
          {t('rbac.addRole')}
        </Button>
      </Box>

      {/* ─── Role DataTable ──────────────────────────────────────────────────── */}
      <DataTable title={t('rbac.roles')} rows={roles ?? []} columns={columns} height={450} pageSize={10} />

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: Add Role
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title={t('rbac.addRole')}
        maxWidth="sm"
        error={createMutation.error}
        actions={[
          { label: t('common.cancel'), onClick: () => setAddDialogOpen(false), variant: 'text' },
          {
            label: t('common.add'),
            onClick: () => createMutation.mutate(formData),
            isLoading: createMutation.isPending,
            disabled: !formData.name.trim(),
          },
        ]}
      >
        <TextField
          autoFocus
          margin="dense"
          label={t('rbac.roleName')}
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <TextField
          margin="dense"
          label={t('rbac.roleDesc')}
          fullWidth
          multiline
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: Delete Role
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title={t('rbac.deleteRole')}
        maxWidth="xs"
        error={deleteMutation.error}
        actions={[
          { label: t('common.cancel'), onClick: () => setDeleteDialogOpen(false), variant: 'text' },
          {
            label: t('common.delete'),
            onClick: () => selectedRole && deleteMutation.mutate(selectedRole.id),
            color: 'error',
            isLoading: deleteMutation.isPending,
          },
        ]}
      >
        <Typography>{t('rbac.deleteRoleConfirm')}</Typography>
        {selectedRole && (
          <Paper sx={{ p: 1.5, mt: 1.5, border: '1px solid', borderColor: 'error.light' }} elevation={0}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedRole.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedRole.description}
            </Typography>
          </Paper>
        )}
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: Set Permission
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={permDialogOpen}
        onClose={() => setPermDialogOpen(false)}
        fullScreen={isMobile}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 0.5 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SecurityIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                Set Permission
              </Typography>
              {selectedRole && (
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                  Role:&nbsp;
                  <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {selectedRole.name}
                  </Box>
                </Typography>
              )}
            </Box>
            <Chip
              label={`${activePermIds.size} aktif`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22, borderRadius: 1, flexShrink: 0 }}
            />
          </Box>
        }
        maxWidth="sm"
        contentSx={{ p: 0 }}
        actions={[
          { label: 'Selesai', onClick: () => setPermDialogOpen(false) },
        ]}
      >
        {/* ── Search bar ── */}
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

        {/* ── Accordion List ── */}
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

                  {/* ── Group header row ── */}
                  <ListItemButton
                    onClick={() => toggleGroupExpand(group)}
                    sx={{
                      px: 2.5,
                      py: 1.25,
                      gap: 1.5,
                      bgcolor: isOpen ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: isOpen ? 'primary.dark' : 'action.hover',
                      },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: isOpen ? '#fff' : 'text.primary',
                          }}
                        >
                          {group}
                        </Typography>
                      }
                    />

                    {/* permission summary chips */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {activeCount > 0 && (
                        <Chip
                          label={`${activeCount}/${totalCount}`}
                          size="small"
                          color={isFullyActive ? 'success' : 'warning'}
                          variant={isOpen ? 'filled' : 'outlined'}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            borderRadius: 1,
                            fontWeight: 700,
                            ...(isOpen && {
                              bgcolor: 'rgba(255,255,255,0.25)',
                              color: '#fff',
                              borderColor: 'transparent',
                            }),
                          }}
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

                  {/* ── Expanded: action toggles ── */}
                  <Collapse in={isOpen} unmountOnExit>
                    <Box
                      sx={{
                        bgcolor: 'action.hover',
                        px: 2.5,
                        py: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.25,
                        borderLeft: '3px solid',
                        borderColor: 'primary.main',
                      }}
                    >
                      {ACTION_COLUMNS.map((col) => {
                        const exists = groupHasAction(group, col.key);
                        const checked = hasPermission(group, col.key);

                        return (
                          <Box
                            key={col.key}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 0.75,
                              px: 1,
                              borderRadius: 1,
                              opacity: exists ? 1 : 0.38,
                              bgcolor: checked && exists ? 'primary.main' + '14' : 'transparent',
                              transition: 'background-color 0.15s',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {/* colored dot indicator */}
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: checked && exists ? 'primary.main' : 'divider',
                                  transition: 'background-color 0.15s',
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: checked && exists ? 600 : 400,
                                  color: checked && exists ? 'primary.main' : 'text.primary',
                                }}
                              >
                                {col.label}
                              </Typography>
                              {!exists && (
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                                  (tidak tersedia)
                                </Typography>
                              )}
                            </Box>

                            <Switch
                              checked={checked}
                              onChange={() => exists && handlePermissionToggle(group, col.key)}
                              disabled={!exists}
                              size="small"
                              color="primary"
                            />
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
              <Typography variant="body2" color="text.disabled">
                Tidak ada kategori yang cocok
              </Typography>
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}