import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Dialog, Card } from '@/components/ui';
import type { Role } from '@/types/rbac';
import type { ApiError } from '@/types/api';

interface DeleteRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isPending: boolean;
  error: ApiError | null;
  role: Role | null;
}

export function DeleteRoleDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  error,
  role,
}: DeleteRoleDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('rbac.deleteRole')}
      maxWidth="xs"
      error={error}
      actions={[
        { label: t('common.cancel'), onClick: onClose, variant: 'text' },
        {
          label: t('common.delete'),
          onClick: () => role && onConfirm(role.id),
          color: 'error',
          isLoading: isPending,
        },
      ]}
    >
      <Typography>{t('rbac.deleteRoleConfirm')}</Typography>
      {role && (
        <Card sx={{ p: 1.5, mt: 1.5, borderColor: 'error.light' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{role.name}</Typography>
          <Typography variant="caption" color="text.secondary">{role.description}</Typography>
        </Card>
      )}
    </Dialog>
  );
}
