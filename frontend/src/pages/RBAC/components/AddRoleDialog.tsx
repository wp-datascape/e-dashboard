import { useState } from 'react';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui';
import type { ApiError } from '@/types/api';
import type { CreateRolePayload } from '@/types/rbac';

interface AddRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRolePayload) => void;
  isPending: boolean;
  error: ApiError | null;
}

export function AddRoleDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  error,
}: AddRoleDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateRolePayload>({ name: '', description: '' });

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('rbac.addRole')}
      maxWidth="sm"
      error={error}
      actions={[
        { label: t('common.cancel'), onClick: handleClose, variant: 'text' },
        {
          label: t('common.add'),
          onClick: handleSubmit,
          isLoading: isPending,
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
  );
}
