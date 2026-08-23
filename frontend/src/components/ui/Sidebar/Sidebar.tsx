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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

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
  item: Omit<NavItem, 'groupLabelKey' | 'children'>
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
        {/* Selalu di-render (bukan collapsed && <ListItemText/>) — sebelumnya teks
            unmount/mount INSTAN pas collapsed berubah, jadi kedip tiba-tiba di tengah
            animasi lebar drawer yang smooth. Sekarang fade opacity sinkron durasi/easing
            dengan transisi width Drawer (lihat 'transition: width' di bawah), pointerEvents
            none saat collapsed supaya tidak ke-klik teks yang sedang transparan. */}
        <ListItemText
          primary={t(item.labelKey)}
          sx={{
            opacity: collapsed ? 0 : 1,
            transition: (theme) => theme.transitions.create('opacity', {
              easing: theme.transitions.easing.sharp,
              duration: collapsed ? theme.transitions.duration.leavingScreen : theme.transitions.duration.enteringScreen,
            }),
            pointerEvents: collapsed ? 'none' : 'auto',
          }}
          slotProps={{
            primary: {
              variant: 'body2',
              noWrap: true,
              sx: { fontWeight: active ? 600 : 400, color: active ? 'primary.main' : 'text.primary', fontSize: '0.82rem' },
            },
          }}
        />
      </ListItemButton>
    </Tooltip>
  )
}

function NavGroup({
  item,
  collapsed,
  onNav,
  canSee,
  expanded,
  onToggle,
}: {
  item: NavItem
  collapsed: boolean
  onNav: (path: string) => void
  canSee: (permissionKey?: string) => boolean
  /** Accordion eksklusif (2026-08-22, instruksi user: "saat sub menu
   * terbuka, sub menu lain tertutup otomatis menghindari scroll") — state
   * "grup mana yang lagi terbuka" DIANGKAT ke Sidebar (1 sumber utk SEMUA
   * NavGroup), bukan lagi `useState` lokal per grup (dulu tiap grup bisa
   * expanded bersamaan, sidebar jadi sangat panjang kalau user buka
   * Business+Data+Settings sekaligus). */
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const location = useLocation()

  // Hooks WAJIB dipanggil sebelum early return manapun (Rules of Hooks) — makanya
  // visibleChildren/anyChildActive dihitung duluan di sini, bukan setelah cek canSee.
  const visibleChildren = (item.children ?? []).filter((c) => canSee(c.permissionKey))
  const anyChildActive = visibleChildren.some(
    (c) => location.pathname === c.path || location.pathname.startsWith(c.path)
  )
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  // Jika parent punya permissionKey dan user tidak punya → sembunyikan seluruh grup
  if (!canSee(item.permissionKey)) return null

  if (visibleChildren.length === 0) return null

  if (collapsed) {
    return (
      <>
        <Tooltip title={t(item.labelKey)} placement="right" arrow>
          <ListItemButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            selected={anyChildActive}
            sx={{ ...NAV_ITEM_SX, justifyContent: 'center' }}
          >
            <ListItemIcon sx={{ minWidth: 0, color: anyChildActive ? 'primary.main' : 'text.secondary', justifyContent: 'center' }}>
              {item.icon}
            </ListItemIcon>
          </ListItemButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          {visibleChildren.map((child) => {
            const active = location.pathname === child.path || location.pathname.startsWith(child.path)
            return (
              <MenuItem
                key={child.key}
                selected={active}
                onClick={() => {
                  setAnchorEl(null)
                  onNav(child.path)
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: active ? 'primary.main' : 'text.secondary' }}>
                  {child.icon}
                </ListItemIcon>
                {t(child.labelKey)}
              </MenuItem>
            )
          })}
        </Menu>
      </>
    )
  }

  return (
    <>
      <ListItemButton
        onClick={onToggle}
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
        {/* Indikator +/- (2026-08-22, koreksi user: "jangan pakai arrow")
            — bukan lagi chevron ExpandMore/Less. Tertutup = "+" (bisa
            dibuka), terbuka = "-" (bisa ditutup). */}
        {expanded ? <RemoveIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <AddIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
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

/** Cek apakah satu item akan ter-render (visible) berdasarkan permission */
function isNavItemVisible(item: NavItem, canSee: (k?: string) => boolean): boolean {
  if (!canSee(item.permissionKey)) return false
  if (!item.children) return true
  return item.children.some((c) => canSee(c.permissionKey))
}

/** Kelompokkan NAV_ITEMS menjadi sections berdasarkan groupLabel boundary */
type NavSection = { groupLabelKey?: string; items: NavItem[] }
function buildNavSections(items: NavItem[]): NavSection[] {
  return items.reduce<NavSection[]>((acc, item) => {
    if (item.groupLabelKey) {
      acc.push({ groupLabelKey: item.groupLabelKey, items: [item] })
    } else {
      if (acc.length === 0) acc.push({ items: [] })
      acc[acc.length - 1].items.push(item)
    }
    return acc
  }, [])
}

export const Sidebar = ({ open, onClose, variant = 'permanent' }: SidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { permissions } = useAuth()
  const collapsed = !open
  const drawerWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  const canSee = (permissionKey?: string) => {
    if (!permissionKey) return true
    return permissions.includes(permissionKey)
  }

  // Accordion eksklusif antar grup collapsible (Business/Report/Data/
  // Settings/dst, 2026-08-22, instruksi user: "saat sub menu terbuka, sub
  // menu lain tertutup otomatis menghindari scroll") — 1 state di sini,
  // dioper ke tiap <NavGroup> sbg expanded/onToggle (bukan lagi useState
  // lokal per grup). Default: grup yang MEMUAT path aktif saat mount
  // (mis. buka /report/growth -> grup "Report" otomatis terbuka), null
  // kalau tidak ada yang match (semua grup tertutup).
  const [expandedKey, setExpandedKey] = useState<string | null>(() => {
    const activeGroup = NAV_ITEMS.find((i) =>
      i.children?.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path))
    )
    return activeGroup?.key ?? null
  })

  const handleNav = (path: string) => {
    navigate(path)
    if (variant === 'temporary') onClose()
  }

  const navSections = buildNavSections(NAV_ITEMS)

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
          // will-change: 'width' — hint browser siapkan compositing layer lebih awal
          // sebelum transisi mulai. Dipasang permanen di sini (BUKAN di banyak
          // elemen/card - itu yang harus dihindari, boros memori GPU) karena ini cuma
          // 1 elemen navigasi tunggal yang memang selalu jadi sumber animasi ini.
          willChange: 'width',
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
      {/* variant="temporary" Drawer render dari y=0 (di atas AppBar) — sama seperti
          spacer di DashboardLayout, item nav pertama bisa ketutup status bar iOS
          tanpa penyesuaian ini */}
      <Toolbar sx={{ mb: 'env(safe-area-inset-top)' }} />
      <Divider />

      <List dense disablePadding sx={{ pt: 0.5 }}>
        {navSections.map((section) => {
          // Skip seluruh section (divider + label + items) jika tidak ada item visible
          const hasVisible = section.items.some((item) => isNavItemVisible(item, canSee))
          if (!hasVisible) return null

          return (
            <span key={section.groupLabelKey ?? '__root__'}>
              {section.groupLabelKey && (
                <>
                  <Divider sx={{ mt: 0.5, mb: 0 }} />
                  {/* Collapse (bukan !collapsed && <Box/>) — label ini makan RUANG
                      VERTIKAL (padding+tinggi teks), beda dari ListItemText nav item yang
                      cuma di-clip horizontal oleh overflowX:hidden Drawer. Collapse
                      animasikan height-nya jadi 0 dengan smooth (+ fade bawaan), bukan
                      unmount instan yang bikin konten di bawahnya "loncat" naik tiba-tiba. */}
                  <Collapse in={!collapsed} timeout="auto" unmountOnExit>
                    <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled', display: 'block' }}>
                        {section.groupLabelKey && t(section.groupLabelKey)}
                      </Typography>
                    </Box>
                  </Collapse>
                </>
              )}

              {section.items.map((item) => {
                if (!isNavItemVisible(item, canSee)) return null
                return item.children
                  ? (
                    <NavGroup
                      key={item.key}
                      item={item}
                      collapsed={collapsed}
                      onNav={handleNav}
                      canSee={canSee}
                      expanded={expandedKey === item.key}
                      onToggle={() => setExpandedKey((k) => (k === item.key ? null : item.key))}
                    />
                  )
                  : <NavButton key={item.key} item={item} collapsed={collapsed} onNav={handleNav} />
              })}
            </span>
          )
        })}
      </List>
    </Drawer>
  )
}
