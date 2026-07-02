import Button, { ButtonProps } from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';
import { useLogoutMutation } from '@/hooks/useAuth';

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  label?: string;
}

export const LogoutButton = ({ label, ...props }: LogoutButtonProps) => {
  const logoutMutation = useLogoutMutation();
  const { t } = useTranslation();

  return (
    <Button
      variant="outlined"
      color="error"
      startIcon={<LogoutIcon />}
      onClick={() => logoutMutation.mutate()}
      {...props}
    >
      {label ?? t('common.logout')}
    </Button>
  );
};