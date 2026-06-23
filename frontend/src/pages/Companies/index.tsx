// frontend/src/pages/Companies/index.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { ResponsiveListView } from '@/components/tables/ResponsiveListView';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '@/hooks/useCompanies';
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '@/types/companies';

// Components
import { CompanyDialog } from './components/CompanyDialog';
import { CompanyDetailDialog } from './components/CompanyDetailDialog';
import { BranchSection } from './components/BranchSection';

// ─── Types ───────────────────────────────────────────────────────────────────

type DialogMode = 'create' | 'edit' | 'view' | 'delete' | 'branches' | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Companies() {
  const { t } = useTranslation();

  // ── State ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // ── Data ──
  const { data: companies = [], isLoading } = useCompanies();

  // ── Mutations ──
  const { mutate: createCompany, isPending: isCreating, error: createError, reset: resetCreate } = useCreateCompany();
  const { mutate: updateCompany, isPending: isUpdating, error: updateError, reset: resetUpdate } = useUpdateCompany();
  const { mutate: deleteCompany, isPending: isDeleting, error: deleteError, reset: resetDelete } = useDeleteCompany();

  // ── Dialog handlers ──
  const closeDialog = () => {
    setDialogMode(null);
    resetCreate();
    resetUpdate();
    resetDelete();
  };

  const openCreate = () => {
    resetCreate();
    setDialogMode('create');
  };

  const openMenuAction = (mode: DialogMode) => {
    setDialogMode(mode);
    setMenuAnchor(null);
  };

  // ── Submit handlers ──
  const onCreateSubmit = (payload: CreateCompanyPayload) => {
    createCompany(payload, { onSuccess: closeDialog });
  };

  const onEditSubmit = (payload: UpdateCompanyPayload) => {
    if (!selectedCompany) return;
    updateCompany(
      { id: selectedCompany.id, payload },
      { onSuccess: closeDialog },
    );
  };

  const onDeleteConfirm = () => {
    if (!selectedCompany) return;
    deleteCompany(selectedCompany.id, {
      onSuccess: () => {
        closeDialog();
        setSelectedCompany(null);
      },
    });
  };

  // ── DataGrid columns ──
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
      width: 56,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const company = params.row as Company;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchor(e.currentTarget);
                setSelectedCompany(company);
              }}
              aria-label={t('common.actions')}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('companies.title')}
        </Typography>
        <Button startIcon={<AddIcon />} onClick={openCreate}>
          {t('companies.addCompany')}
        </Button>
      </Box>

      {/* ── Table ── */}
      <ResponsiveListView
        rows={companies}
        columns={columns}
        loading={isLoading}
        height={560}
      />

      {/* ── Action Menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 180 } } }}
      >
        <MenuItem onClick={() => openMenuAction('view')} dense>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t('companies.viewCompany')} />
        </MenuItem>
        <MenuItem onClick={() => { resetUpdate(); openMenuAction('edit'); }} dense>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t('companies.editCompany')} />
        </MenuItem>
        <MenuItem onClick={() => { resetUpdate(); openMenuAction('branches'); }} dense>
          <ListItemIcon><BusinessIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t('companies.manageBranches')} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { resetDelete(); openMenuAction('delete'); }}
          dense
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t('companies.deleteCompany')} />
        </MenuItem>
      </Menu>

      {/* ── Dialogs ── */}
      <CompanyDialog
        open={dialogMode === 'create'}
        onClose={closeDialog}
        onSubmit={onCreateSubmit}
        isPending={isCreating}
        error={createError}
        mode="create"
      />

      <CompanyDialog
        open={dialogMode === 'edit'}
        onClose={closeDialog}
        onSubmit={onEditSubmit}
        isPending={isUpdating}
        error={updateError}
        mode="edit"
        company={selectedCompany}
      />

      <CompanyDetailDialog
        open={dialogMode === 'view'}
        onClose={closeDialog}
        company={selectedCompany}
        onDelete={() => {
          if (!selectedCompany) return;
          deleteCompany(selectedCompany.id, {
            onSuccess: () => {
              closeDialog();
              setSelectedCompany(null);
            },
          });
        }}
      />

      <BranchSection
        open={dialogMode === 'branches'}
        onClose={closeDialog}
        company={selectedCompany}
      />

      {/* Delete Confirmation */}
      <CompanyDialog
        open={dialogMode === 'delete'}
        onClose={closeDialog}
        onSubmit={onDeleteConfirm}
        isPending={isDeleting}
        error={deleteError}
        mode="delete"
        company={selectedCompany}
      />
    </Box>
  );
}