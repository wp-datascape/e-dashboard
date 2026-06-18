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
import Alert from '@mui/material/Alert';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/types/api';
import type { Role } from '@/types/rbac';
import type { Company, CreateUserPayload } from '@/types/users';

const createSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role_id: z.number().int().min(1, 'Pilih role'),
  company_ids: z.array(z.number()).min(1, 'Pilih minimal 1 perusahaan'),
});

type CreateFormData = z.infer<typeof createSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => void;
  isPending: boolean;
  error: ApiError | null;
  roles: Role[];
  companies: Company[];
}

export function CreateUserDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  error,
  roles,
  companies,
}: CreateUserDialogProps) {
  const { t } = useTranslation();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role_id: 0, company_ids: [] },
  });

  const handleFormSubmit = (data: CreateFormData) => {
    onSubmit({
      name: data.name,
      email: data.email,
      password: data.password,
      role_ids: [data.role_id],
      company_ids: data.company_ids,
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getErrMsg = (err: ApiError): string =>
    err.message ?? t('common.errorOccurred');

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('users.addUser')}
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
                placeholder={t('users.namePlaceholder')}
                fullWidth
                size="small"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          {/* Email */}
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('users.email')}
                placeholder={t('users.emailPlaceholder')}
                type="email"
                fullWidth
                size="small"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />

          {/* Password */}
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('users.password')}
                placeholder={t('users.passwordPlaceholder')}
                type="password"
                fullWidth
                size="small"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
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

          {/* Mutation error */}
          {!!error && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              {getErrMsg(error)}
            </Alert>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button type="button" variant="text" onClick={handleClose} disabled={isPending}>
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
