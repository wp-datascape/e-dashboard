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
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/theme/theme.context';
import { useLogoutMutation } from '@/hooks/useAuth';
import { AppLogo } from '@/components/ui/AppLogo';

interface AppBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const DashboardAppBar = ({ onToggleSidebar }: AppBarProps) => {
  const { t } = useTranslation();
  const { toggleTheme, isDark } = useThemeMode();
  const logoutMutation = useLogoutMutation();

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
        // iOS standalone PWA (apple-mobile-web-app-status-bar-style: black-translucent
        // di index.html) bikin status bar jadi overlay transparan, bukan mendorong
        // konten ke bawah — tanpa ini, tombol menu di Toolbar ketutup status bar dan
        // tidak bisa di-tap. env() resolve ke 0 di browser biasa/Android, aman di semua platform.
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Sidebar Toggle */}
        <IconButton
          edge="start"
          onClick={onToggleSidebar}
          color="inherit"
          aria-label={t('common.toggleSidebar')}
          sx={{ mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <AppLogo sx={{ fontSize: 20 }} />
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
          <IconButton color="inherit" onClick={() => logoutMutation.mutate()} size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </MuiAppBar>
  );
};
