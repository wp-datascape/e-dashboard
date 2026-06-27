import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { NAV_ITEMS, type NavItem } from '@/config/menu';
import { useAuth } from '@/context/auth.context';

export const SIDEBAR_WIDTH = 220;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
}

const NAV_ITEM_SX = {
  minHeight: 40,
  px: 2,
  borderRadius: 0,
  '&.Mui-selected': {
    bgcolor: 'action.selected',
    borderLeft: '3px solid',
    borderColor: 'primary.main',
    '& .MuiListItemIcon-root': { color: 'primary.main' },
  },
  '&:hover': { bgcolor: 'action.hover' },
}

function NavButton({
  item,
  collapsed,
  indented = false,
  onNav,
}: {
  item: Omit<NavItem, 'groupLabel' | 'children'>
  collapsed: boolean
  indented?: boolean
  onNav: (path: string) => void
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const active = location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

  return (
    <Tooltip title={collapsed ? t(item.labelKey) : ''} placement="right" arrow>
      <ListItemButton
        onClick={() => onNav(item.path)}
        selected={active}
        sx={{
          ...NAV_ITEM_SX,
          justifyContent: collapsed ? 'center' : 'flex-start',
          pl: indented && !collapsed ? 4 : 2,
          '&.Mui-selected': {
            ...NAV_ITEM_SX['&.Mui-selected'],
            pl: collapsed ? 2 : (indented ? '29px' : '13px'),
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, color: active ? 'primary.main' : 'text.secondary', justifyContent: 'center' }}>
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={t(item.labelKey)}
            slotProps={{
              primary: {
                variant: 'body2',
                noWrap: true,
                sx: { fontWeight: active ? 600 : 400, color: active ? 'primary.main' : 'text.primary', fontSize: '0.82rem' },
              },
            }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  )
}

function NavGroup({
  item,
  collapsed,
  onNav,
  canSee,
}: {
  item: NavItem
  collapsed: boolean
  onNav: (path: string) => void
  canSee: (permissionKey?: string) => boolean
}) {
  const { t } = useTranslation()
  const location = useLocation()

  const visibleChildren = (item.children ?? []).filter((c) => canSee(c.permissionKey))

  const anyChildActive = visibleChildren.some(
    (c) => location.pathname === c.path || location.pathname.startsWith(c.path)
  )
  const [expanded, setExpanded] = useState(anyChildActive)

  if (visibleChildren.length === 0) return null

  if (collapsed) {
    const firstChild = visibleChildren[0]
    return (
      <Tooltip title={t(item.labelKey)} placement="right" arrow>
        <ListItemButton
          onClick={() => firstChild && onNav(firstChild.path)}
          selected={anyChildActive}
          sx={{ ...NAV_ITEM_SX, justifyContent: 'center' }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: anyChildActive ? 'primary.main' : 'text.secondary', justifyContent: 'center' }}>
            {item.icon}
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    )
  }

  return (
    <>
      <ListItemButton
        onClick={() => setExpanded((p) => !p)}
        selected={anyChildActive && !expanded}
        sx={{ ...NAV_ITEM_SX, justifyContent: 'flex-start' }}
      >
        <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: anyChildActive ? 'primary.main' : 'text.secondary', justifyContent: 'center' }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={t(item.labelKey)}
          slotProps={{
            primary: {
              variant: 'body2',
              noWrap: true,
              sx: { fontWeight: anyChildActive ? 600 : 400, color: anyChildActive ? 'primary.main' : 'text.primary', fontSize: '0.82rem' },
            },
          }}
        />
        {expanded ? <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
      </ListItemButton>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List dense disablePadding>
          {visibleChildren.map((child) => (
            <NavButton key={child.key} item={child} collapsed={false} indented onNav={onNav} />
          ))}
        </List>
      </Collapse>
    </>
  )
}

export const Sidebar = ({ open, onClose, variant = 'permanent' }: SidebarProps) => {
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const collapsed = !open
  const drawerWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  const canSee = (permissionKey?: string) => {
    if (!permissionKey) return true
    return permissions.includes(permissionKey)
  }

  const handleNav = (path: string) => {
    navigate(path)
    if (variant === 'temporary') onClose()
  }

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
      <Toolbar />
      <Divider />

      <List dense disablePadding sx={{ pt: 0.5 }}>
        {NAV_ITEMS.map((item) => {
          if (!canSee(item.permissionKey) && !item.children) return null

          return (
            <span key={item.key}>
              {item.groupLabel && (
                <>
                  <Divider sx={{ mt: 0.5, mb: 0 }} />
                  {!collapsed && (
                    <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled', display: 'block' }}>
                        {item.groupLabel}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {item.children
                ? <NavGroup item={item} collapsed={collapsed} onNav={handleNav} canSee={canSee} />
                : <NavButton item={item} collapsed={collapsed} onNav={handleNav} />
              }
            </span>
          )
        })}
      </List>
    </Drawer>
  )
}
