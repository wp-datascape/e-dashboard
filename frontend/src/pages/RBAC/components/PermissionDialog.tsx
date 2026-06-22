import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import SecurityIcon from '@mui/icons-material/Security';
import { Dialog } from '@/components/ui';
import type { Permission, CreatePermissionPayload, UpdatePermissionPayload } from '@/types/rbac';
import { useState, useEffect } from 'react';
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
  const [formData, setFormData] = useState<CreatePermissionPayload>({
    name: '',
    description: '',
    category: '',
  });

  useEffect(() => {
    if (permission) {
      setFormData({
        name: permission.name,
        description: permission.description || '',
        category: permission.category || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
      });
    }
  }, [permission, open]);

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
              {isEditMode ? 'Edit Permission' : 'Create Permission'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
              {isEditMode ? 'Update permission details' : 'Add new permission to the system'}
            </Typography>
          </Box>
        </Box>
      }
      maxWidth="sm"
      contentSx={{ p: 2 }}
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'outlined' },
        { label: isEditMode ? 'Update' : 'Create', onClick: handleSubmit, isLoading },
      ]}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Box sx={{ p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography variant="caption" color="error">
              {error instanceof Error ? error.message : 'An error occurred'}
            </Typography>
          </Box>
        )}

        <TextField
          label="Permission Name"
          placeholder="e.g., users:manage"
          fullWidth
          size="small"
          value={formData.name}
          onChange={handleChange('name')}
          disabled={isEditMode}
          helperText={isEditMode ? 'Permission name cannot be changed' : 'Use format: feature:action'}
          required
        />

        <TextField
          label="Category"
          placeholder="e.g., users, roles, config"
          fullWidth
          size="small"
          value={formData.category}
          onChange={handleChange('category')}
          helperText="Optional: Group this permission by category"
        />

        <TextField
          label="Description"
          placeholder="What does this permission allow?"
          fullWidth
          size="small"
          multiline
          rows={3}
          value={formData.description}
          onChange={handleChange('description')}
          helperText="Optional: Brief description of the permission"
        />
      </Box>
    </Dialog>
  );
}