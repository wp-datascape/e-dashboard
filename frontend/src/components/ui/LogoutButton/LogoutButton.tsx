import Button, { ButtonProps } from '@mui/material/Button';import { useAuth } from '@/context/auth.context';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  label?: string;
}

export const LogoutButton = ({ label, ...props }: LogoutButtonProps) => {
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <Button
      variant="outlined"
      color="error"
      startIcon={<LogoutIcon />}
      onClick={() => logout()}
      {...props}
    >
      {label ?? t('common.logout')}
    </Button>
  );
};