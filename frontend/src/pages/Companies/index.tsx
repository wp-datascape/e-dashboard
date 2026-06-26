// frontend/src/pages/Companies/index.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Button, StatusChip, ActionMenu } from '@/components/ui';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '@/hooks/useCompanies';
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '@/types/companies';

import { CompanyDialog } from './components/CompanyDialog';
import { CompanyDetailDialog } from './components/CompanyDetailDialog';
import { BranchSection } from './components/BranchSection';

// ─── Types ───────────────────────────────────────────────────────────────────

type DialogMode = 'create' | 'edit' | 'view' | 'delete' | 'branches' | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Companies() {
  const { t } = useTranslation();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { data: companies = [], isLoading } = useCompanies();

  const { mutate: createCompany, isPending: isCreating, error: createError, reset: resetCreate } = useCreateCompany();
  const { mutate: updateCompany, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateCompany();
  const { mutate: deleteCompany, isPending: isDeleting, error: deleteError, reset: resetDelete } = useDeleteCompany();

  const closeDialog = () => {
    setDialogMode(null);
    resetCreate();
    resetUpdate();
    resetDelete();
  };

  const onCreateSubmit = (payload: CreateCompanyPayload) => {
    createCompany(payload, { onSuccess: closeDialog });
  };

  const onEditSubmit = (payload: UpdateCompanyPayload) => {
    if (!selectedCompany) return;
    updateCompany({ id: selectedCompany.id, payload }, { onSuccess: closeDialog });
  };

  const onDeleteConfirm = () => {
    if (!selectedCompany) return;
    deleteCompany(selectedCompany.id, { onSuccess: () => { closeDialog(); setSelectedCompany(null); } });
  };

  const columns: GridColDef[] = [
    { field: 'code', headerName: t('companies.code'), width: 110 },
    { field: 'name', headerName: t('companies.name'), flex: 1, minWidth: 200 },
    {
      field: 'branch_count',
      headerName: t('companies.branches'),
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <StatusChip label={String(params.row.branch_count ?? 0)} color="info" />
        </Box>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 110,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const company = params.row as Company;
        return (
          <ActionMenu
            items={[
              { label: t('companies.viewCompany'), icon: <VisibilityIcon />, onClick: () => { setSelectedCompany(company); setDialogMode('view'); } },
              { label: t('companies.editCompany'), icon: <EditIcon />, onClick: () => { resetUpdate(); setSelectedCompany(company); setDialogMode('edit'); } },
              { label: t('companies.manageBranches'), icon: <BusinessIcon />, onClick: () => { setSelectedCompany(company); setDialogMode('branches'); } },
              { label: t('companies.deleteCompany'), icon: <DeleteIcon />, onClick: () => { resetDelete(); setSelectedCompany(company); setDialogMode('delete'); }, color: 'error', dividerBefore: true },
            ]}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('companies.title')}
        </Typography>
        <Button startIcon={<AddIcon />} onClick={() => { resetCreate(); setDialogMode('create'); }} mobileIconOnly>
          {t('companies.addCompany')}
        </Button>
      </Box>

      <ResponsiveListView rows={companies} columns={columns} loading={isLoading} height={560} />

      <CompanyDialog open={dialogMode === 'create'} onClose={closeDialog} onSubmit={onCreateSubmit} isPending={isCreating} error={createError} mode="create" />
      <CompanyDialog open={dialogMode === 'edit'} onClose={closeDialog} onSubmit={onEditSubmit} isPending={isUpdating} error={updateError} mode="edit" company={selectedCompany} />
      <CompanyDetailDialog
        open={dialogMode === 'view'}
        onClose={closeDialog}
        company={selectedCompany}
        onDelete={() => {
          if (!selectedCompany) return;
          deleteCompany(selectedCompany.id, { onSuccess: () => { closeDialog(); setSelectedCompany(null); } });
        }}
      />
      <BranchSection open={dialogMode === 'branches'} onClose={closeDialog} company={selectedCompany} />
      <CompanyDialog open={dialogMode === 'delete'} onClose={closeDialog} onSubmit={onDeleteConfirm} isPending={isDeleting} error={deleteError} mode="delete" company={selectedCompany} />
    </Box>
  );
}
