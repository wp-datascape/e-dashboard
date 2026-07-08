import MuiDialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export interface DialogAction {
  label: string;
  onClick: () => void;
  color?: 'primary' | 'error' | 'warning' | 'success';
  variant?: 'text' | 'outlined' | 'contained';
  isLoading?: boolean;
  disabled?: boolean;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  /** Konten sekunder di bawah title (mis. ringkasan statistik) — dirender di dalam title bar yang sama. */
  subtitle?: React.ReactNode;
  /** Icon button tambahan di title bar (mis. export PDF), dirender di sebelah kiri tombol close. */
  headerActions?: React.ReactNode;
  /** Tampilkan tombol X di title bar. Default false — dialog dengan tombol Cancel/Close di footer biasanya tidak butuh ini juga. */
  showCloseButton?: boolean;
  children: React.ReactNode;
  actions?: DialogAction[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  error?: { message: string } | null;
  footer?: React.ReactNode;
  contentSx?: object;
  paperSx?: object;
}

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  showCloseButton = false,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  error = null,
  footer,
  contentSx,
  paperSx,
}: DialogProps) {
  const { t } = useTranslation();
  const hasHeaderExtras = !!headerActions || showCloseButton;

  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      slotProps={{ paper: { sx: paperSx } }}
    >
      <DialogTitle component="div" sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, px: 3, py: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'primary.main' }}>{title}</Box>
            {subtitle}
          </Box>
          {hasHeaderExtras && (
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, mt: -0.25 }}>
              {headerActions}
              {showCloseButton && (
                <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }} aria-label={t('common.close')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={contentSx}>
        {children}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(error as { message?: string })?.message ?? t('common.errorOccurred')}
          </Alert>
        )}
      </DialogContent>

      {(actions || footer) && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {footer}
          {actions?.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              color={action.color}
              variant={action.variant ?? 'contained'}
              isLoading={action.isLoading}
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          ))}
        </DialogActions>
      )}
    </MuiDialog>
  );
}