// frontend/src/pages/Users/index.tsx
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '@/components/tables/DataTable';
import { Dialog } from '@/components/ui/Dialog';
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
import type { User } from '@/types/users';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role_id: z.number().int().min(1, 'Pilih role'),
  company_ids: z.array(z.number()).min(1, 'Pilih minimal 1 perusahaan'),
});

const editSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  role_id: z.number().int().min(1, 'Pilih role'),
  company_ids: z.array(z.number()).min(1, 'Pilih minimal 1 perusahaan'),
  is_active: z.boolean(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;
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

const getErrMsg = (err: unknown, fallback: string): string =>
  (err as { message?: string })?.message ?? fallback;

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

  // ── Create form ──
  const {
    handleSubmit: handleCreateSubmit,
    control: createControl,
    reset: resetCreateForm,
    formState: { errors: ce },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role_id: 0, company_ids: [] as number[] },
  });

  // ── Edit form ──
  const {
    handleSubmit: handleEditSubmit,
    control: editControl,
    reset: resetEditForm,
    formState: { errors: ee },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', role_id: 0, company_ids: [] as number[], is_active: true },
  });

  // Populate edit form when dialog opens
  useEffect(() => {
    if (dialogMode === 'edit' && selectedUser) {
      resetEditForm({
        name: selectedUser.name,
        role_id: selectedUser.roles[0]?.id ?? 0,
        company_ids: selectedUser.companies.map(c => c.id),
        is_active: selectedUser.is_active,
      });
    }
  }, [dialogMode, selectedUser, resetEditForm]);

  // ── Dialog handlers ──
  const closeDialog = () => {
    setDialogMode(null);
    resetCreate();
    resetUpdate();
    resetDelete();
  };

  const openCreate = () => {
    resetCreateForm({ name: '', email: '', password: '', role_id: 0, company_ids: [] });
    resetCreate();
    setDialogMode('create');
  };

  const openMenuAction = (mode: DialogMode) => {
    setDialogMode(mode);
    setMenuAnchor(null);
  };

  // ── Submit handlers ──
  const onCreateSubmit = (data: CreateFormData) => {
    createUser(
      {
        name: data.name,
        email: data.email,
        password: data.password,
        role_ids: [data.role_id],
        company_ids: data.company_ids,
      },
      { onSuccess: closeDialog },
    );
  };

  const onEditSubmit = (data: EditFormData) => {
    if (!selectedUser) return;
    updateUser(
      {
        id: selectedUser.id,
        payload: {
          name: data.name,
          role_ids: [data.role_id],
          company_ids: data.company_ids,
          is_active: data.is_active,
        },
      },
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

  // ─────────────────────────────────────────────────────────────────────────────

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

      {/* ══════════════════════════════════════════════════════════════════════════
          VIEW DIALOG
      ══════════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={dialogMode === 'view'}
        onClose={closeDialog}
        title={t('users.viewUser')}
        maxWidth="sm"
        actions={[{ label: t('common.close'), onClick: closeDialog, variant: 'text' }]}
      >
        {selectedUser && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* Name */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
                {t('users.name')}
              </Typography>
              <Typography variant="body2">{selectedUser.name}</Typography>
            </Box>

            {/* Email */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
                {t('users.email')}
              </Typography>
              <Typography variant="body2">{selectedUser.email}</Typography>
            </Box>

            {/* Role */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
                {t('users.role')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedUser.roles.map(r => (
                  <StatusChip key={r.id} label={r.name} color={getRoleColor(r.name)} />
                ))}
              </Box>
            </Box>

            {/* Companies */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600, pt: 0.25 }}>
                {t('users.companies')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedUser.companies.map(c => (
                  <StatusChip key={c.id} label={c.name} color="default" />
                ))}
              </Box>
            </Box>

            {/* Status */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
                {t('common.status')}
              </Typography>
              <StatusChip
                label={selectedUser.is_active ? t('common.active') : t('common.inactive')}
                color={selectedUser.is_active ? 'success' : 'default'}
              />
            </Box>

            {/* Last Login */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
                {t('users.lastLogin')}
              </Typography>
              <Typography variant="body2">
                {selectedUser.last_login_at
                  ? new Date(selectedUser.last_login_at).toLocaleString('id-ID')
                  : t('users.noLastLogin')}
              </Typography>
            </Box>

            {/* Created */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
                {t('users.createdAt')}
              </Typography>
              <Typography variant="body2">{fmtDate(selectedUser.created_at, '-')}</Typography>
            </Box>

            {/* Permissions */}
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                Permissions ({selectedUser.permissions.length})
              </Typography>
              {selectedUser.permissions.length === 0 ? (
                <Typography variant="body2" color="text.disabled">—</Typography>
              ) : (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {selectedUser.permissions.map(p => (
                    <StatusChip key={p} label={p} color="default" size="small" />
                  ))}
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════════
          CREATE DIALOG
      ══════════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={dialogMode === 'create'}
        onClose={closeDialog}
        title={t('users.addUser')}
        maxWidth="sm"
      >
        <form onSubmit={handleCreateSubmit(onCreateSubmit)} noValidate>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {/* Name */}
            <Controller
              name="name"
              control={createControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('users.name')}
                  placeholder={t('users.namePlaceholder')}
                  fullWidth
                  size="small"
                  error={!!ce.name}
                  helperText={ce.name?.message}
                />
              )}
            />

            {/* Email */}
            <Controller
              name="email"
              control={createControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('users.email')}
                  placeholder={t('users.emailPlaceholder')}
                  type="email"
                  fullWidth
                  size="small"
                  error={!!ce.email}
                  helperText={ce.email?.message}
                />
              )}
            />

            {/* Password */}
            <Controller
              name="password"
              control={createControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('users.password')}
                  placeholder={t('users.passwordPlaceholder')}
                  type="password"
                  fullWidth
                  size="small"
                  error={!!ce.password}
                  helperText={ce.password?.message}
                />
              )}
            />

            {/* Role */}
            <Controller
              name="role_id"
              control={createControl}
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={!!fieldState.error}>
                  <InputLabel>{t('users.selectRole')}</InputLabel>
                  <Select
                    value={(field.value === 0 ? '' : field.value) as number | ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                    label={t('users.selectRole')}
                  >
                    {roles.map(role => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormHelperText>{fieldState.error.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* Companies */}
            <Controller
              name="company_ids"
              control={createControl}
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={!!fieldState.error}>
                  <InputLabel>{t('users.selectCompanies')}</InputLabel>
                  <Select
                    multiple
                    value={field.value ?? []}
                    onChange={(e) => field.onChange(e.target.value as number[])}
                    input={<OutlinedInput label={t('users.selectCompanies')} />}
                    renderValue={(selected) =>
                      companies
                        .filter(c => (selected as number[]).includes(c.id))
                        .map(c => c.name)
                        .join(', ')
                    }
                  >
                    {companies.map(co => (
                      <MenuItem key={co.id} value={co.id}>
                        <Checkbox size="small" checked={(field.value ?? []).includes(co.id)} />
                        <ListItemText primary={co.name} />
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormHelperText>{fieldState.error.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* Mutation error */}
            {createError && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {getErrMsg(createError, t('common.errorOccurred'))}
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button type="button" variant="text" onClick={closeDialog} disabled={isCreating}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={isCreating}>
                {t('common.save')}
              </Button>
            </Box>
          </Stack>
        </form>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════════
          EDIT DIALOG
      ══════════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={dialogMode === 'edit'}
        onClose={closeDialog}
        title={t('users.editUser')}
        maxWidth="sm"
      >
        <form onSubmit={handleEditSubmit(onEditSubmit)} noValidate>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {/* Name */}
            <Controller
              name="name"
              control={editControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('users.name')}
                  fullWidth
                  size="small"
                  error={!!ee.name}
                  helperText={ee.name?.message}
                />
              )}
            />

            {/* Email — read-only */}
            <TextField
              label={t('users.email')}
              value={selectedUser?.email ?? ''}
              fullWidth
              size="small"
              disabled
            />

            {/* Role */}
            <Controller
              name="role_id"
              control={editControl}
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={!!fieldState.error}>
                  <InputLabel>{t('users.selectRole')}</InputLabel>
                  <Select
                    value={(field.value === 0 ? '' : field.value) as number | ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                    label={t('users.selectRole')}
                  >
                    {roles.map(role => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormHelperText>{fieldState.error.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* Companies */}
            <Controller
              name="company_ids"
              control={editControl}
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={!!fieldState.error}>
                  <InputLabel>{t('users.selectCompanies')}</InputLabel>
                  <Select
                    multiple
                    value={field.value ?? []}
                    onChange={(e) => field.onChange(e.target.value as number[])}
                    input={<OutlinedInput label={t('users.selectCompanies')} />}
                    renderValue={(selected) =>
                      companies
                        .filter(c => (selected as number[]).includes(c.id))
                        .map(c => c.name)
                        .join(', ')
                    }
                  >
                    {companies.map(co => (
                      <MenuItem key={co.id} value={co.id}>
                        <Checkbox size="small" checked={(field.value ?? []).includes(co.id)} />
                        <ListItemText primary={co.name} />
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormHelperText>{fieldState.error.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* Active toggle */}
            <Controller
              name="is_active"
              control={editControl}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {field.value ? t('common.active') : t('common.inactive')}
                    </Typography>
                  }
                />
              )}
            />

            {/* Mutation error */}
            {updateError && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {getErrMsg(updateError, t('common.errorOccurred'))}
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button type="button" variant="text" onClick={closeDialog} disabled={isUpdating}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={isUpdating}>
                {t('common.save')}
              </Button>
            </Box>
          </Stack>
        </form>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════════
          DELETE DIALOG
      ══════════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={dialogMode === 'delete'}
        onClose={closeDialog}
        title={t('users.deleteUser')}
        maxWidth="xs"
        error={deleteError as Error | null}
        actions={[
          { label: t('common.cancel'), onClick: closeDialog, variant: 'text' },
          {
            label: t('common.delete'),
            onClick: onDeleteConfirm,
            color: 'error',
            isLoading: isDeleting,
          },
        ]}
      >
        <Typography variant="body2">{t('users.deleteConfirm')}</Typography>
        {selectedUser && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 600 }}>
            {selectedUser.name} ({selectedUser.email})
          </Typography>
        )}
      </Dialog>
    </Box>
  );
}