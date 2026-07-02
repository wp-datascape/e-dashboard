import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

interface AlertProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  showButton?: boolean; // Prop baru untuk menentukan apakah tombol bawah muncul
}

export const AppAlert = ({ open, title, message, onClose, showButton = false }: AlertProps) => {
  const { t } = useTranslation();
  return (
  <Dialog
    open={open} 
    onClose={onClose} 
    fullWidth 
    maxWidth="xs"
    slotProps={{ paper: { sx: { borderRadius: 0, p: 1 } } }}
  >
    {/* Tombol Close di kanan atas */}
    <IconButton 
      onClick={onClose} 
      sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
    >
      <CloseIcon />
    </IconButton>

    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, pb: 1 }}>
      <WarningAmberRoundedIcon color="error" sx={{ fontSize: 48, mb: 1 }} />
      <DialogTitle sx={{ textAlign: 'center', p: 0, fontWeight: 'bold' }}>
        {title}
      </DialogTitle>
    </Box>
    
    <DialogContent sx={{ textAlign: 'center' }}>
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </DialogContent>
    
    {/* Tombol bawah hanya muncul jika showButton = true */}
    {showButton && (
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} variant="contained" size="medium" sx={{ borderRadius: 0 }}>
          {t('common.ok')}
        </Button>
      </DialogActions>
    )}
  </Dialog>
  );
};