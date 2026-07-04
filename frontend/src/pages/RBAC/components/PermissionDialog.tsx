import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import SecurityIcon from '@mui/icons-material/Security';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui';
import type { Permission, CreatePermissionPayload, UpdatePermissionPayload } from '@/types/rbac';
import { getApiErrorMessage } from '@/utils/apiError';
import { useState } from 'react';
import Typography from '@mui/material/Typography';

interface PermissionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePermissionPayload | UpdatePermissionPayload) => void;
  permission?: Permission | null;
  isLoading?: boolean;
  error?: Error | null;
}

export function PermissionDialog({
  open,
  onClose,
  onSubmit,
  permission = null,
  isLoading = false,
  error,
}: PermissionDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreatePermissionPayload>({
    name: permission?.name ?? '',
    description: permission?.description ?? '',
    category: permission?.category ?? '',
  });

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const isEditMode = !!permission;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={false}
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 0.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SecurityIcon sx={{ color: 'common.white', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
              {isEditMode ? t('rbac.permissionDialog.editTitle') : t('rbac.permissionDialog.createTitle')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
              {isEditMode ? t('rbac.permissionDialog.editSubtitle') : t('rbac.permissionDialog.createSubtitle')}
            </Typography>
          </Box>
        </Box>
      }
      maxWidth="sm"
      contentSx={{ p: 2 }}
      actions={[
        { label: t('common.cancel'), onClick: onClose, variant: 'outlined' },
        { label: isEditMode ? t('rbac.permissionDialog.updateAction') : t('rbac.permissionDialog.createAction'), onClick: handleSubmit, isLoading },
      ]}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Box sx={{ p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography variant="caption" color="error">
              {getApiErrorMessage(error, t)}
            </Typography>
          </Box>
        )}

        <TextField
          label={t('rbac.permissionDialog.fieldName')}
          placeholder={t('rbac.permissionDialog.fieldNamePlaceholder')}
          fullWidth
          size="small"
          value={formData.name}
          onChange={handleChange('name')}
          disabled={isEditMode}
          helperText={isEditMode ? t('rbac.permissionDialog.fieldNameHelperEdit') : t('rbac.permissionDialog.fieldNameHelperCreate')}
          required
        />

        <TextField
          label={t('rbac.permissionDialog.fieldCategory')}
          placeholder={t('rbac.permissionDialog.fieldCategoryPlaceholder')}
          fullWidth
          size="small"
          value={formData.category}
          onChange={handleChange('category')}
          helperText={t('rbac.permissionDialog.fieldCategoryHelper')}
        />

        <TextField
          label={t('rbac.permissionDialog.fieldDescription')}
          placeholder={t('rbac.permissionDialog.fieldDescriptionPlaceholder')}
          fullWidth
          size="small"
          multiline
          rows={3}
          value={formData.description}
          onChange={handleChange('description')}
          helperText={t('rbac.permissionDialog.fieldDescriptionHelper')}
        />
      </Box>
    </Dialog>
  );
}