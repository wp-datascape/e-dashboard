// frontend/src/pages/Companies/components/CompanyDetailDialog.tsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { StatusChip } from '@/components/ui/StatusChip';
import { useBranchesByCompany } from '@/hooks/useCompanies';
import type { Company } from '@/types/companies';

interface Props {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  onDelete: () => void;
}

export function CompanyDetailDialog({ open, onClose, company, onDelete }: Props) {
  const { t } = useTranslation();
  const companyId = company?.id ?? null;
  const { data: branches = [] } = useBranchesByCompany(companyId);

  if (!company) return null;

  const detailRows = [
    { label: t('companies.code'), value: company.code },
    { label: t('companies.name'), value: company.name },
    { label: t('companies.branches'), value: branches.length > 0 ? '' : '—' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('companies.dialog.view.title')}
      actions={[
        { label: t('common.close'), onClick: onClose, variant: 'outlined' },
        { label: t('companies.dialog.delete.submit'), onClick: onDelete, color: 'error' },
      ]}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {detailRows.map((row) => (
          <Box key={row.label}>
            <Typography variant="caption" color="text.secondary">
              {row.label}
            </Typography>
            {row.value !== '' ? (
              <Typography variant="body1">{row.value}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                {branches.map((branch) => (
                  <Box
                    key={branch.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 60 }}>
                      {branch.code}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {branch.name}
                    </Typography>
                    <StatusChip
                      label={branch.is_active ? t('common.active') : t('common.inactive')}
                      color={branch.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            )}
            <Divider sx={{ mt: 1 }} />
          </Box>
        ))}
      </Box>
    </Dialog>
  );
}