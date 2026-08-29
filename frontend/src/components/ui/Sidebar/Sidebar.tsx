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
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { NAV_ITEMS, type NavItem, isPathActive, isNavItemVisible } from '@/config/menu';
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
  const active = isPathActive(item.path, location.pathname)

  return (
    <Tooltip title={collapsed ? t(item.labelKey) : ''} placement="right" arrow>
      <ListItemButton
        onClick={() => onNav(item.path)}
        selected={active}
        sx={{
          ...NAV_ITEM_SX,
          justifyContent: collapsed ? 'center' : 'flex-start',
          // pl:6 (bukan pl:4) - setelah chevron kiri ditambah di NavGroup,
          // ikon parent sendiri mulai bergeser ke ~40px (16px padding +
          // chevron+margin), jadi indentasi anak yang lama (32px) malah
          // JATUH SEBELUM ikon parent-nya - hirarki tidak kelihatan
          // (koreksi user, screenshot). 48px sekarang jatuh setelah ikon
          // parent, submenu jelas menjorok ke kanan.
          pl: indented && !collapsed ? 6 : 2,
          '&.Mui-selected': {
            ...NAV_ITEM_SX['&.Mui-selected'],
            pl: collapsed ? 2 : (indented ? '45px' : '13px'),
          },
        }}
      >
        {/* Item top-level TANPA anak (Overview, Info & Panduan, Bantuan)
            butuh ruang kosong seukuran chevron NavGroup (ikon 20px + mr
            4px = 24px) SEBELUM ikonnya sendiri - kalau tidak, ikonnya
            nempel ke kiri sementara item top-level yang PUNYA anak
            (Business, Laporan, dst) ikonnya sudah didorong ke kanan oleh
            chevron, jadi semua ikon top-level tidak sejajar satu baris
            (koreksi user, screenshot). Submenu (indented) TIDAK butuh ini -
            dia punya area/indentasi sendiri, tidak perlu sejajar dgn
            top-level. */}
        {!indented && !collapsed && <Box sx={{ width: '24px', flexShrink: 0 }} />}
        {/* Item submenu (indented) SENGAJA tanpa ikon (instruksi user) -
            submenu murni teks, biar tidak ramai berdampingan dengan ikon
            besar milik parent-nya, dan hirarki lebih ditekankan lewat
            indentasi + bgcolor area submenu (lihat NavGroup) daripada
            ikon berulang. */}
        {!indented && (
          <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, color: active ? 'primary.main' : 'text.secondary', justifyContent: 'center' }}>
            {item.icon}
          </ListItemIcon>
        )}
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
  const anyChildActive = visibleChildren.some((c) => isPathActive(c.path, location.pathname))
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
            const active = isPathActive(child.path, location.pathname)
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
        {/* Chevron indikator expand/collapse DI KIRI, sebelum ikon menu
            (2026-08-27, instruksi user: "ganti tanda +/- jadi chevron di
            sebelah kiri bukan kanan" — membalikkan keputusan 2026-08-22
            yang sebelumnya ganti chevron ke +/-). 1 ikon diputar 90° saat
            terbuka (mengarah ke bawah), bukan ganti-ganti 2 ikon berbeda —
            transisinya jadi animasi rotate yang mulus. */}
        <ChevronRightIcon
          fontSize="small"
          sx={{
            color: 'text.secondary',
            mr: 0.5,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: (theme) => theme.transitions.create('transform', { duration: theme.transitions.duration.shorter }),
          }}
        />
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
      </ListItemButton>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {/* bgcolor sedikit lebih gelap dari background sidebar (instruksi
            user: "penanda area inside") - menandai area submenu ini
            "di dalam" grup parent-nya, bukan cuma mengandalkan indentasi
            teks. action.hover dipakai konsisten dgn pola "kotak subtle"
            lain di app ini (mis. code block MarkdownContent). */}
        {/* Garis vertikal lurus dari ujung chevron parent (instruksi user)
            - posisi left:25px dihitung dari titik tengah ChevronRightIcon
            di ListItemButton parent (px:2=16px padding + lebar ikon
            "small"=20px, tengahnya jatuh di ~26px). '::before' dipakai,
            bukan elemen terpisah, supaya tidak nambah node DOM per grup. */}
        <List
          dense
          disablePadding
          sx={{
            position: 'relative',
            bgcolor: 'action.hover',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '25px',
              top: 0,
              bottom: 0,
              width: '1px',
              // 'divider' kontrasnya kurang di mode gelap terhadap bgcolor
              // action.hover di atas (dilaporkan user, tidak terlihat) -
              // text.disabled dipilih karena nilainya eksplisit beda di
              // light/dark (theme/index.ts: #94A3B8 vs #475569), jadi
              // kontrasnya terjamin di kedua tema, bukan cuma "kebetulan
              // kelihatan" di salah satu mode saja.
              bgcolor: 'text.disabled',
            },
          }}
        >
          {visibleChildren.map((child) => (
            <NavButton key={child.key} item={child} collapsed={false} indented onNav={onNav} />
          ))}
        </List>
      </Collapse>
    </>
  )
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
      i.children?.some((c) => isPathActive(c.path, location.pathname))
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
