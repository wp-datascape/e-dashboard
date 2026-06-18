import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import type { User } from '@/types/users';
import type { ApiError } from '@/types/api';

interface DeleteUserDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  error: ApiError | null;
  user: User | null;
}

export function DeleteUserDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  error,
  user,
}: DeleteUserDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('users.deleteUser')}
      maxWidth="xs"
      error={error}
      actions={[
        { label: t('common.cancel'), onClick: onClose, variant: 'text' },
        {
          label: t('common.delete'),
          onClick: onConfirm,
          color: 'error',
          isLoading: isPending,
        },
      ]}
    >
      <Typography variant="body2">{t('users.deleteConfirm')}</Typography>
      {user && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 600 }}>
          {user.name} ({user.email})
        </Typography>
      )}
    </Dialog>
  );
}
