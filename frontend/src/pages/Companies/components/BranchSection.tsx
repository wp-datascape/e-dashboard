// frontend/src/pages/Companies/components/BranchSection.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
  useBranchesByCompany,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from '@/hooks/useCompanies';
import type { Company } from '@/types/companies';

interface Props {
  open: boolean;
  onClose: () => void;
  company: Company | null;
}

interface EditableBranch {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  isEditing?: boolean;
}

export function BranchSection({ open, onClose, company }: Props) {
  const { t } = useTranslation();
  const companyId = company?.id ?? null;

  const { data: branches = [], isLoading } = useBranchesByCompany(companyId);
  const { mutate: createBranch, isPending: isCreating } = useCreateBranch();
  const { mutate: updateBranch, isPending: isUpdating } = useUpdateBranch();
  const { mutate: deleteBranch, isPending: isDeleting } = useDeleteBranch();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; code: string }>({ name: '', code: '' });
  const [newBranch, setNewBranch] = useState<{ name: string; code: string } | null>(null);

  const handleStartEdit = (branch: EditableBranch) => {
    setEditingId(branch.id);
    setEditValues({ name: branch.name, code: branch.code });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({ name: '', code: '' });
  };

  const handleSaveEdit = (branchId: number) => {
    if (!companyId || !editValues.name.trim() || !editValues.code.trim()) return;
    updateBranch(
      {
        branchId,
        companyId,
        payload: {
          name: editValues.name.trim(),
          code: editValues.code.trim().toUpperCase(),
        },
      },
      { onSuccess: () => handleCancelEdit() },
    );
  };

  const handleCreateBranch = () => {
    if (!companyId || !newBranch?.name.trim() || !newBranch?.code.trim()) return;
    createBranch(
      {
        companyId,
        payload: {
          name: newBranch.name.trim(),
          code: newBranch.code.trim().toUpperCase(),
          is_active: true,
        },
      },
      { onSuccess: () => setNewBranch(null) },
    );
  };

  const handleToggleActive = (branch: EditableBranch) => {
    if (!companyId) return;
    updateBranch(
      {
        branchId: branch.id,
        companyId,
        payload: { is_active: !branch.is_active },
      },
    );
  };

  const handleDeleteBranch = (branchId: number) => {
    if (!companyId) return;
    if (window.confirm(t('companies.branchManagement.deleteConfirm'))) {
      deleteBranch({ branchId, companyId });
    }
  };

  if (!company) return null;

  const isPending = isCreating || isUpdating || isDeleting;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${t('companies.manageBranches')} — ${company.name}`}
      maxWidth="md"
      actions={[
        { label: t('common.close'), onClick: onClose, variant: 'outlined' },
      ]}
    >
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          {t('common.loading')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Existing Branches */}
          {branches.map((branch) => {
            const isEditing = editingId === branch.id;
            return (
              <Box
                key={branch.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {isEditing ? (
                  <>
                    <TextField
                      size="small"
                      value={editValues.name}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                      sx={{ flex: 1 }}
                      placeholder={t('companies.branchManagement.namePlaceholder')}
                    />
                    <TextField
                      size="small"
                      value={editValues.code}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      sx={{ width: 100 }}
                      placeholder={t('companies.branchManagement.codePlaceholder')}
                      slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                    />
                    <Tooltip title={t('common.save')}>
                      <IconButton size="small" color="primary" onClick={() => handleSaveEdit(branch.id)} disabled={isPending}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.cancel')}>
                      <IconButton size="small" onClick={handleCancelEdit} disabled={isPending}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 100 }}>
                      {branch.code}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {branch.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" color={branch.is_active ? 'success.main' : 'text.disabled'}>
                        {t('common.inactive')}
                      </Typography>
                      <Switch
                        size="small"
                        checked={branch.is_active}
                        onChange={() => handleToggleActive(branch)}
                        disabled={isPending}
                      />
                      <Typography variant="caption" color={branch.is_active ? 'success.main' : 'text.disabled'}>
                        {t('common.active')}
                      </Typography>
                    </Box>
                    <Tooltip title={t('common.edit')}>
                      <IconButton size="small" onClick={() => handleStartEdit(branch)} disabled={isPending}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" color="error" onClick={() => handleDeleteBranch(branch.id)} disabled={isPending}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            );
          })}

          {/* Add New Branch Row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              border: '1px dashed',
              borderColor: 'primary.main',
              borderRadius: 1,
            }}
          >
            {newBranch ? (
              <>
                <TextField
                  size="small"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch((prev) => ({ ...prev!, name: e.target.value }))}
                  sx={{ flex: 1 }}
                  placeholder={t('companies.branchManagement.namePlaceholder')}
                />
                <TextField
                  size="small"
                  value={newBranch.code}
                  onChange={(e) => setNewBranch((prev) => ({ ...prev!, code: e.target.value.toUpperCase() }))}
                  sx={{ width: 100 }}
                  placeholder={t('companies.branchManagement.codePlaceholder')}
                  slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                />
                <Tooltip title={t('common.save')}>
                  <IconButton size="small" color="primary" onClick={handleCreateBranch} disabled={isPending}>
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.cancel')}>
                  <IconButton size="small" onClick={() => setNewBranch(null)} disabled={isPending}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {t('companies.branchManagement.addNew')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setNewBranch({ name: '', code: '' })}
                >
                  {t('companies.branchManagement.add')}
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}
    </Dialog>
  );
}