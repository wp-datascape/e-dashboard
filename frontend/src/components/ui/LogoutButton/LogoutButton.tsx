import Button, { ButtonProps } from '@mui/material/Button';import { useAuth } from '@/context/auth.context';
import LogoutIcon from '@mui/icons-material/Logout';

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  label?: string;
}

export const LogoutButton = ({ label = 'Logout', ...props }: LogoutButtonProps) => {
  const { logout } = useAuth();

  return (
    <Button
      variant="outlined"
      color="error"
      startIcon={<LogoutIcon />}
      onClick={() => logout()}
      {...props}
    >
      {label}
    </Button>
  );
};