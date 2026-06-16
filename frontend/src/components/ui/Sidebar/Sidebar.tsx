import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';

import { NAV_ITEMS } from '@/config/menu';

export const SIDEBAR_WIDTH = 220;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
}

export const Sidebar = ({ open, onClose, variant = 'permanent' }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const collapsed = !open;
  const drawerWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const handleNav = (path: string) => {
    navigate(path);
    if (variant === 'temporary') onClose();
  };

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          overflowX: 'hidden',
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: open
                ? theme.transitions.duration.enteringScreen
                : theme.transitions.duration.leavingScreen,
            }),
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          boxSizing: 'border-box',
        },
      }}
    >
      {/* Spacer for AppBar height */}
      <Toolbar />
      <Divider />

      <List dense disablePadding sx={{ pt: 0.5 }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;

          return (
            <span key={item.key}>
              {/* Group divider */}
              {item.dividerBefore && <Divider sx={{ my: 0.5 }} />}

              <Tooltip
                title={collapsed ? t(item.labelKey) : ''}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => handleNav(item.path)}
                  selected={active}
                  sx={{
                    minHeight: 42,
                    px: 2,
                    borderRadius: 0,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      borderLeft: '3px solid',
                      borderColor: 'primary.main',
                      pl: collapsed ? 2 : '13px', // compensate 3px border
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: collapsed ? 0 : 1.5,
                      color: active ? 'primary.main' : 'text.secondary',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  {!collapsed && (
                    <ListItemText
                      primary={t(item.labelKey)}
                      slotProps={{
                        primary: {
                          variant: 'body2',
                          noWrap: true,
                          sx: {
                            fontWeight: active ? 600 : 400,
                            color: active ? 'primary.main' : 'text.primary',
                          },
                        },
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </span>
          );
        })}
      </List>
    </Drawer>
  );
};
