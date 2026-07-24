import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CheckIcon from '@mui/icons-material/Check';
import SignalCellular0BarIcon from '@mui/icons-material/SignalCellular0Bar';
import SignalCellular2BarIcon from '@mui/icons-material/SignalCellular2Bar';
import SignalCellular4BarIcon from '@mui/icons-material/SignalCellular4Bar';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useTranslation } from 'react-i18next';
import { Card, StatusChip } from '@/components/ui';
import { useCan } from '@/hooks/useCan';
import { useNetworkThrottle, useUpdateNetworkThrottle, useUpdateNetworkThrottleDelay } from '@/hooks/useAbTesting';
import type { NetworkThrottleMode, ConfigurableThrottleMode } from '@/api/abTesting.api';

const MODES: { mode: NetworkThrottleMode; icon: React.ReactNode; labelKey: string; descKey?: string }[] = [
  { mode: 'off', icon: <SignalCellular4BarIcon fontSize="large" />, labelKey: 'abTesting.modeOff', descKey: 'abTesting.modeOffDesc' },
  { mode: '4g',  icon: <SignalCellular2BarIcon fontSize="large" />, labelKey: 'abTesting.mode4g' },
  { mode: '3g',  icon: <SignalCellular0BarIcon fontSize="large" />, labelKey: 'abTesting.mode3g' },
  { mode: 'offline', icon: <CloudOffIcon fontSize="large" />, labelKey: 'abTesting.modeOffline', descKey: 'abTesting.modeOfflineDesc' },
];

// Kolom edit besaran delay (ms) — dipisah dari klik pilih mode (stopPropagation),
// state lokal supaya bisa ngetik bebas sebelum di-submit lewat tombol centang.
function DelayEditor({
  mode, savedValue, canUpdate,
}: {
  mode: ConfigurableThrottleMode;
  savedValue: number;
  canUpdate: boolean;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(savedValue));
  // Sinkron ulang kalau nilai tersimpan berubah dari luar (mis. tab lain / refetch) —
  // di-adjust langsung saat render (pola resmi React utk "adjust state when a prop
  // changes"), bukan lewat useEffect, supaya tidak ada render tambahan/cascading.
  const [prevSavedValue, setPrevSavedValue] = useState(savedValue);
  if (savedValue !== prevSavedValue) {
    setPrevSavedValue(savedValue);
    setValue(String(savedValue));
  }
  const { mutate: updateDelay, isPending } = useUpdateNetworkThrottleDelay();

  const numValue = Number(value);
  const isDirty = value !== '' && numValue !== savedValue;
  const isValid = value !== '' && Number.isInteger(numValue) && numValue >= 0 && numValue <= 30_000;

  const handleSave = () => {
    if (!isValid || !isDirty) return;
    updateDelay({ mode, delayMs: numValue });
  };

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}
    >
      <TextField
        size="small"
        type="number"
        value={value}
        disabled={!canUpdate || isPending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        error={value !== '' && !isValid}
        slotProps={{
          input: {
            endAdornment: <InputAdornment position="end">ms</InputAdornment>,
            sx: { fontSize: '0.8rem' },
          },
          htmlInput: { min: 0, max: 30_000, style: { width: 64, textAlign: 'right' } },
        }}
      />
      <IconButton
        size="small"
        color="primary"
        disabled={!canUpdate || !isDirty || !isValid || isPending}
        onClick={handleSave}
        title={t('abTesting.saveDelay')}
      >
        {isPending ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
      </IconButton>
    </Box>
  );
}

export default function AbTesting() {
  const { t } = useTranslation();
  const can = useCan();
  const { data, isLoading, error } = useNetworkThrottle();
  const { mutate: updateMode, isPending, variables: pendingMode } = useUpdateNetworkThrottle();

  const currentMode = (data?.value ?? 'off') as NetworkThrottleMode;
  const canUpdate = can('access.ab_testing:update');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('nav.abTesting')}</Typography>
      <Typography variant="pageSubtitle" sx={{ mb: 3 }}>{t('abTesting.subtitle')}</Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        {t('abTesting.globalWarning')}
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{t('error.generic')}</Alert>}

      <Card sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Typography variant="body2" color="text.secondary">{t('abTesting.currentMode')}:</Typography>
              <StatusChip
                label={t(MODES.find((m) => m.mode === currentMode)?.labelKey ?? 'abTesting.modeOff')}
                color={currentMode === 'off' ? 'default' : currentMode === '4g' ? 'warning' : 'error'}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {MODES.map(({ mode, icon, labelKey, descKey }) => {
                const isActive = currentMode === mode;
                const isBusy = isPending && pendingMode === mode;
                const isConfigurable = mode === '3g' || mode === '4g';
                return (
                  <ButtonBase
                    key={mode}
                    disabled={!canUpdate || isPending}
                    onClick={() => updateMode(mode)}
                    sx={{
                      flex: '1 1 200px',
                      minWidth: 180,
                      p: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      border: '2px solid',
                      borderColor: isActive ? 'primary.main' : 'divider',
                      bgcolor: isActive ? 'action.selected' : 'background.paper',
                      borderRadius: 1,
                      transition: 'border-color 0.15s, background-color 0.15s',
                      '&:hover': { borderColor: canUpdate ? 'primary.main' : 'divider' },
                    }}
                  >
                    {isBusy ? <CircularProgress size={32} /> : icon}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t(labelKey)}</Typography>
                    {isConfigurable ? (
                      <DelayEditor mode={mode} savedValue={data?.delays[mode] ?? 0} canUpdate={canUpdate} />
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                        {t(descKey ?? '')}
                      </Typography>
                    )}
                  </ButtonBase>
                );
              })}
            </Box>

            {!canUpdate && (
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
                {t('abTesting.readOnlyNote')}
              </Typography>
            )}
          </>
        )}
      </Card>
    </Box>
  );
}
