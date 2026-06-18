import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/theme/theme.context';
import { useAuth } from '@/context/auth.context';

interface AppBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const DashboardAppBar = ({ onToggleSidebar }: AppBarProps) => {
  const { t } = useTranslation();
  const { toggleTheme, isDark } = useThemeMode();
  const { logout } = useAuth();

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Sidebar Toggle */}
        <IconButton
          edge="start"
          onClick={onToggleSidebar}
          color="inherit"
          aria-label="toggle sidebar"
          sx={{ mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography
            variant="h6"
            noWrap
            sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem' }}
          >
            {t('common.appName')}
          </Typography>
        </Box>

        {/* Actions */}
        <Tooltip title={isDark ? t('common.lightMode') : t('common.darkMode')}>
          <IconButton color="inherit" onClick={toggleTheme} size="small">
            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common.logout')}>
          <IconButton color="inherit" onClick={() => logout()} size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </MuiAppBar>
  );
};
