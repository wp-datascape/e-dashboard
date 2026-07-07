// frontend/src/pages/Companies/components/CompanyDialog.tsx
import { useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import type { ApiError } from '@/types/api';
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '@/types/companies';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCompanyPayload | UpdateCompanyPayload | undefined) => void;
  isPending: boolean;
  error: ApiError | null;
  mode: 'create' | 'edit' | 'delete';
  company?: Company | null;
}

export function CompanyDialog({ open, onClose, onSubmit, isPending, error, mode, company }: Props) {
  const { t } = useTranslation();
  const isDelete = mode === 'delete';

  const handleSubmit = useCallback(() => {
    if (isDelete) {
      onSubmit(undefined);
      return;
    }
    const code = (document.getElementById('company-code') as HTMLInputElement)?.value?.trim().toUpperCase();
    const nameValue = (document.getElementById('company-name') as HTMLInputElement)?.value?.trim();
    if (!code || !nameValue) return;

    if (mode === 'create') {
      onSubmit({ code, name: nameValue } as CreateCompanyPayload);
    } else {
      const payload: UpdateCompanyPayload = {};
      if (code !== company?.code) payload.code = code;
      if (nameValue !== company?.name) payload.name = nameValue;
      onSubmit(payload);
    }
  }, [isDelete, mode, company, onSubmit]);

  useEffect(() => {
    if (!open || isDelete) return;
    const codeInput = document.getElementById('company-code') as HTMLInputElement;
    const nameInput = document.getElementById('company-name') as HTMLInputElement;
    if (codeInput) codeInput.value = company?.code ?? '';
    if (nameInput) nameInput.value = company?.name ?? '';
  }, [open, company, isDelete]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(`companies.dialog.${mode}.title`)}
      error={error}
      actions={[
        { label: t('common.cancel'), onClick: onClose, variant: 'outlined' },
        {
          label: t(`companies.dialog.${mode}.submit`),
          onClick: handleSubmit,
          color: isDelete ? 'error' : 'primary',
          isLoading: isPending,
        },
      ]}
    >
      {isDelete ? (
        <Typography variant="body1">
          {t('companies.dialog.delete.confirm', { name: company?.name ?? '' })}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            id="company-code"
            name="code"
            label={t('companies.code')}
            defaultValue={company?.code ?? ''}
            required
            slotProps={{ htmlInput: { maxLength: 50, style: { textTransform: 'uppercase' } } }}
          />
          <TextField
            id="company-name"
            name="name"
            label={t('companies.name')}
            defaultValue={company?.name ?? ''}
            required
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </Box>
      )}
    </Dialog>
  );
}