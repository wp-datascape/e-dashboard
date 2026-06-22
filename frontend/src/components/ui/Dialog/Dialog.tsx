import MuiDialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
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
  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      slotProps={{ paper: { sx: paperSx } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
        {title}
      </DialogTitle>

      <DialogContent sx={contentSx}>
        {children}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(error as { message?: string })?.message ?? 'An error occurred'}
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