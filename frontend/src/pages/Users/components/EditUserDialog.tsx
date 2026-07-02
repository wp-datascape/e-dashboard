import { useEffect } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/types/api';
import type { Role } from '@/types/rbac';
import type { Company, User, UpdateUserPayload } from '@/types/users';

const editSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('users.validation.nameMin')),
  role_id: z.number().int().min(1, t('users.validation.roleRequired')),
  company_ids: z.array(z.number()).min(1, t('users.validation.companiesRequired')),
  is_active: z.boolean(),
  resetPassword: z.boolean(),
  newPassword: z.string(),
}).refine(
  (data) => !data.resetPassword || data.newPassword.length >= 8,
  { message: t('users.validation.newPasswordMin'), path: ['newPassword'] },
);

type EditFormData = z.infer<ReturnType<typeof editSchema>>;

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateUserPayload) => void;
  isPending: boolean;
  error: ApiError | null;
  user: User | null;
  roles: Role[];
  companies: Company[];
}

export function EditUserDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  error,
  user,
  roles,
  companies,
}: EditUserDialogProps) {
  const { t } = useTranslation();

  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema(t)),
    defaultValues: { name: '', role_id: 0, company_ids: [], is_active: true, resetPassword: false, newPassword: '' },
  });

  const resetPassword = watch('resetPassword');

  // Populate form when user changes
  useEffect(() => {
    if (user && open) {
      reset({
        name: user.name,
        role_id: user.roles[0]?.id ?? 0,
        company_ids: user.companies.map(c => c.id),
        is_active: user.is_active,
        resetPassword: false,
        newPassword: '',
      });
    }
  }, [user, open, reset]);

  const handleFormSubmit = (data: EditFormData) => {
    onSubmit({
      name: data.name,
      role_ids: [data.role_id],
      company_ids: data.company_ids,
      is_active: data.is_active,
      ...(data.resetPassword ? { password: data.newPassword } : {}),
    });
  };

  const getErrMsg = (err: ApiError): string =>
    err.message ?? t('common.errorOccurred');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('users.editUser')}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {/* Name */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('users.name')}
                fullWidth
                size="small"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          {/* Email — read-only */}
          <TextField
            label={t('users.email')}
            value={user?.email ?? ''}
            fullWidth
            size="small"
            disabled
          />

          {/* Role */}
          <Controller
            name="role_id"
            control={control}
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
            control={control}
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

          {/* Reset Password */}
          <Controller
            name="resetPassword"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">{t('users.resetPassword')}</Typography>}
              />
            )}
          />
          {resetPassword && (
            <Controller
              name="newPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('users.newPassword')}
                  placeholder={t('users.passwordPlaceholder')}
                  type="password"
                  fullWidth
                  size="small"
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                />
              )}
            />
          )}

          {/* Active toggle */}
          <Controller
            name="is_active"
            control={control}
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
          {!!error && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              {getErrMsg(error)}
            </Alert>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button type="button" variant="text" onClick={onClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isPending}>
              {t('common.save')}
            </Button>
          </Box>
        </Stack>
      </form>
    </Dialog>
  );
}
