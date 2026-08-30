// ExportFieldsDialog.tsx (2026-08-30, instruksi user: "export ditambahkan
// filter field mana saja yg ingin di export") — dialog pilih kolom sebelum
// download Excel, SEMUA field tercentang default (klik Export 2x = export
// semua spt perilaku sebelum fitur ini, tidak nambah friksi kasus umum).
//
// Checkbox "GP Margin (%)" OTOMATIS NONAKTIF kecuali Revenue DAN GP
// sama-sama tercentang (keputusan user, opsi B dari 2 alternatif yg
// diajukan: BUKAN auto-include Revenue/GP yg tidak diminta, BUKAN juga
// tolak dgn error — kolom rumus itu MERUJUK ke kolom Revenue/GP di baris
// yg sama, tanpa keduanya rumusnya rusak, lihat transactions.handler.ts
// `hasGpMarginDeps`). Backend py fallback sendiri (angka statis, bukan
// rumus) kalau situasi ini somehow lolos dari sini — pertahanan berlapis,
// bukan andalan utama.
import { useState } from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useTranslation } from 'react-i18next';
import { EXPORT_FIELDS, ALL_EXPORT_FIELD_KEYS, type ExportFieldDef } from './exportFields';

interface Props {
  open: boolean;
  onClose: () => void;
  onExport: (fields: string[]) => void;
  exporting: boolean;
}

export function ExportFieldsDialog({ open, onClose, onExport, exporting }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_EXPORT_FIELD_KEYS));

  // Reset ke semua tercentang tiap dialog dibuka ulang — bukan diingat dari
  // sesi sebelumnya, biar user selalu mulai dari default yg jelas (semua
  // field), bukan state tersembunyi dari klik terakhir kali. Adjust SAAT
  // RENDER (pola resmi React "adjusting state when a prop changes", SAMA
  // persis dipakai `ResponsiveListView.tsx` prevRows / Transactions/
  // index.tsx filterKey), BUKAN useEffect — hindari render cascade extra.
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

  const isDependencyMet = (field: ExportFieldDef) =>
    !field.dependsOn || field.dependsOn.every((dep) => selected.has(dep));

  const handleExportClick = () => {
    // Buang field yg dependency-nya TIDAK terpenuhi (checkbox disabled)
    // dari hasil akhir, walau somehow ke-track tercentang di state —
    // jaminan tambahan konsisten dgn tampilan disabled-nya.
    const fields = [...selected].filter((key) => {
      const field = EXPORT_FIELDS.find((f) => f.key === key);
      return field ? isDependencyMet(field) : false;
    });
    onExport(fields);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('transactions.exportDialogTitle')}
      subtitle={(
        <Typography variant="caption" color="text.secondary">
          {t('transactions.exportDialogSubtitle')}
        </Typography>
      )}
      maxWidth="xs"
      actions={[
        { label: t('common.cancel'), onClick: onClose, variant: 'text', color: 'primary' },
        { label: t('common.export'), onClick: handleExportClick, isLoading: exporting, disabled: selected.size === 0 },
      ]}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
        <Button variant="text" size="small" onClick={handleSelectAll}>{t('transactions.exportSelectAll')}</Button>
        <Button variant="text" size="small" onClick={handleClearAll}>{t('transactions.exportClearAll')}</Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {EXPORT_FIELDS.map((field) => {
          const enabled = isDependencyMet(field);
          const checkbox = (
            <FormControlLabel
              key={field.key}
              control={(
                <Checkbox
                  size="small"
                  checked={selected.has(field.key) && enabled}
                  disabled={!enabled}
                  onChange={() => toggle(field.key)}
                />
              )}
              label={t(field.labelKey)}
            />
          );
          if (enabled) return checkbox;
          return (
            <Tooltip key={field.key} title={t('transactions.exportGpMarginHint')} placement="right">
              <span>{checkbox}</span>
            </Tooltip>
          );
        })}
      </Box>
      {selected.size === 0 && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {t('transactions.exportEmptyError')}
        </Typography>
      )}
    </Dialog>
  );
}
