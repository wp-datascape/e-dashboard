// ExportFieldsDialog.tsx (2026-08-31, instruksi user: "expor produk belum
// ada fitur pilih field seperti transaksi") — dialog pilih kolom sebelum
// download Excel, SEMUA field tercentang default (klik Export langsung =
// export semua kolom, tidak nambah friksi kasus umum). Pola sama persis
// Transactions/components/ExportFieldsDialog.tsx, TANPA logic dependency
// checkbox (tidak ada kolom rumus Excel di export Produk, semua kolom
// berdiri sendiri).
import { useState } from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useTranslation } from 'react-i18next';
import { EXPORT_FIELDS, ALL_EXPORT_FIELD_KEYS } from './exportFields';

interface Props {
  open: boolean;
  onClose: () => void;
  onExport: (fields: string[]) => void;
  exporting: boolean;
}

export function ExportFieldsDialog({ open, onClose, onExport, exporting }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_EXPORT_FIELD_KEYS));

  // Reset ke semua tercentang tiap dialog dibuka ulang — pola sama persis
  // Transactions/components/ExportFieldsDialog.tsx (adjust state saat render,
  // BUKAN useEffect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSelected(new Set(ALL_EXPORT_FIELD_KEYS));
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSelectAll = () => setSelected(new Set(ALL_EXPORT_FIELD_KEYS));
  const handleClearAll = () => setSelected(new Set());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('products.exportDialogTitle')}
      subtitle={(
        <Typography variant="caption" color="text.secondary">
          {t('products.exportDialogSubtitle')}
        </Typography>
      )}
      maxWidth="xs"
      actions={[
        { label: t('common.cancel'), onClick: onClose, variant: 'text', color: 'primary' },
        { label: t('common.export'), onClick: () => onExport([...selected]), isLoading: exporting, disabled: selected.size === 0 },
      ]}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
        <Button variant="text" size="small" onClick={handleSelectAll}>{t('products.exportSelectAll')}</Button>
        <Button variant="text" size="small" onClick={handleClearAll}>{t('products.exportClearAll')}</Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {EXPORT_FIELDS.map((field) => (
          <FormControlLabel
            key={field.key}
            control={(
              <Checkbox
                size="small"
                checked={selected.has(field.key)}
                onChange={() => toggle(field.key)}
              />
            )}
            label={t(field.labelKey)}
          />
        ))}
      </Box>
      {selected.size === 0 && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {t('products.exportEmptyError')}
        </Typography>
      )}
    </Dialog>
  );
}
