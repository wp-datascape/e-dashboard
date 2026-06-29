// frontend/src/pages/Companies/components/BranchSection.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { Button, ActionMenu, StatusChip } from '@/components/ui';
import { useCan } from '@/hooks/useCan';
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
  const can = useCan();
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
    updateBranch({ branchId: branch.id, companyId, payload: { is_active: !branch.is_active } });
  };

  const handleDeleteBranch = (branchId: number) => {
    if (!companyId) return;
    if (window.confirm(t('companies.branchManagement.deleteConfirm'))) {
      deleteBranch({ branchId, companyId });
    }
  };

  if (!company) return null;

  const isPending = isCreating || isUpdating || isDeleting;

  // Shared card style
  const cardSx = {
    p: 1.5,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
  }

  // Edit/Add form — stacks vertically on mobile
  const EditForm = ({
    name, code,
    onNameChange, onCodeChange,
    onSave, onCancel,
  }: {
    name: string; code: string;
    onNameChange: (v: string) => void; onCodeChange: (v: string) => void;
    onSave: () => void; onCancel: () => void;
  }) => (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
      <TextField
        size="small"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t('companies.branchManagement.namePlaceholder')}
        sx={{ flex: 1 }}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder={t('companies.branchManagement.codePlaceholder')}
          slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
          sx={{ flex: { xs: 1, sm: 'none' }, width: { xs: 'auto', sm: 100 } }}
        />
        <Tooltip title={t('common.save')}>
          <IconButton size="small" color="primary" onClick={onSave} disabled={isPending}>
            <CheckIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.cancel')}>
          <IconButton size="small" onClick={onCancel} disabled={isPending}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

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
              <Box key={branch.id} sx={cardSx}>
                {isEditing ? (
                  <EditForm
                    name={editValues.name}
                    code={editValues.code}
                    onNameChange={(v) => setEditValues((p) => ({ ...p, name: v }))}
                    onCodeChange={(v) => setEditValues((p) => ({ ...p, code: v }))}
                    onSave={() => handleSaveEdit(branch.id)}
                    onCancel={handleCancelEdit}
                  />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 }, alignItems: { sm: 'center' } }}>
                    {/* Code + Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 60 }}>
                        {branch.code}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {branch.name}
                      </Typography>
                    </Box>
                    {/* Status badge + Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
                      <StatusChip
                        label={branch.is_active ? t('common.active') : t('common.inactive')}
                        color={branch.is_active ? 'success' : 'default'}
                      />
                      <ActionMenu
                        items={[
                          { label: t('common.edit'), icon: <EditIcon />, onClick: () => handleStartEdit(branch), hidden: !can('settings.branch:update') },
                          { label: branch.is_active ? t('common.deactivate') : t('common.activate'), icon: <BlockIcon />, onClick: () => handleToggleActive(branch), hidden: !can('settings.branch:update') },
                          { label: t('common.delete'), icon: <DeleteIcon />, onClick: () => handleDeleteBranch(branch.id), color: 'error', dividerBefore: true, hidden: !can('settings.branch:delete') },
                        ]}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}

          {/* Add New Branch Row */}
          <Box
            sx={{
              p: 1.5,
              border: '1px dashed',
              borderColor: 'primary.main',
              borderRadius: 1,
            }}
          >
            {newBranch ? (
              <EditForm
                name={newBranch.name}
                code={newBranch.code}
                onNameChange={(v) => setNewBranch((p) => ({ ...p!, name: v }))}
                onCodeChange={(v) => setNewBranch((p) => ({ ...p!, code: v }))}
                onSave={handleCreateBranch}
                onCancel={() => setNewBranch(null)}
              />
            ) : can('settings.branch:create') ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              </Box>
            ) : null}
          </Box>
        </Box>
      )}
    </Dialog>
  );
}
