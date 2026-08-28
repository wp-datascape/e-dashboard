import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { NavItem } from '@/config/menu';
import { isPathActive } from '@/config/menu';
import { MOBILE_BOTTOM_NAV_HEIGHT, type MobileNavGroup } from '@/config/mobileNav';

interface NavigationSheetProps {
  /** Grup yang lagi dibuka, null = sheet tertutup */
  group: MobileNavGroup | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
  canSee: (permissionKey?: string) => boolean;
}

// Ambang gestur swipe-kiri (instruksi user: "swipe kiri untuk kembali ke
// level atasnya, dari 3 ke 2, dari 2 ke 1" — bukan tombol back/close, "itu
// tidak terkesan natif"). Swipe-turun-untuk-tutup TIDAK butuh kode di sini
// sama sekali — itu perilaku BAWAAN SwipeableDrawer (drag ke arah anchor),
// aktif selama tidak di-disable eksplisit.
const SWIPE_ACTIVATION_THRESHOLD_PX = 8; // touch-slop sebelum gestur dianggap disengaja
const SWIPE_BACK_DISTANCE_PX = 60; // jarak minimum ke kiri utk dianggap "mundur"
const SWIPE_BACK_VELOCITY_FLOOR = 0.5; // px/ms — flick cepat juga commit walau jarak belum jauh

/** Bottom sheet hierarkis (task034, direvisi sesuai instruksi user 2026-08-28:
 * "drawer muncul di belakang nav bottom" + "swipe down untuk menutup, swipe
 * kiri untuk mundur 1 level, bukan tombol close/back — itu tidak terkesan
 * natif"). Level 2 = children grup yang dibuka dari bottom nav, level 3 =
 * children dari salah satu item level 2 (mis. bucket "Menu" -> Settings ->
 * 8 sub-halamannya). */
export const NavigationSheet = ({ group, onClose, onNavigate, canSee }: NavigationSheetProps) => {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={group !== null}
      onClose={onClose}
      // Sheet ini cuma dibuka lewat tap tombol bottom nav (bukan gesture swipe
      // dari tepi layar), jadi onOpen tidak perlu melakukan apa-apa — state
      // open sepenuhnya dikendalikan parent (BottomNav). Swipe ke ARAH TUTUP
      // (turun, sesuai anchor="bottom") TETAP aktif — itu perilaku bawaan
      // SwipeableDrawer yang tidak disentuh prop ini.
      onOpen={() => {}}
      disableSwipeToOpen
      // zIndex LEBIH RENDAH dari MobileBottomNav (drawer+1) — instruksi user:
      // nav bar tetap terlihat di depan/atas, TIDAK ketutup sheet saat sheet
      // terbuka (kebalikan dari revisi z-index sebelumnya yang membuat sheet
      // menang). Konsekuensinya: strip bawah sheet setinggi nav bar TERTUTUP
      // secara visual oleh nav bar itu sendiri — makanya List di bawah diberi
      // padding-bottom setinggi nav bar (lihat SheetBody), item terakhir tetap
      // bisa discroll sampai kelihatan penuh, bukan hilang di baliknya.
      sx={{ zIndex: (theme) => theme.zIndex.drawer }}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            // dvh (dynamic viewport height), BUKAN vh — di Chrome/Safari
            // mobile, vh dihitung dari viewport TERBESAR (address bar
            // disembunyikan), padahal saat sheet dibuka address bar biasanya
            // masih tampil. dvh selalu ikut ukuran viewport AKTUAL saat itu.
            maxHeight: '80dvh',
            // display:flex + overflow:hidden WAJIB — tanpa ini, konten yang
            // lebih tinggi dari maxHeight TIDAK di-scroll, dia TUMPAH KELUAR
            // batas kotak tanpa cara dijangkau (bug yang pernah dilaporkan:
            // sebagian item menu hilang total). overflowY:auto di List
            // (SheetBody) baru bisa bekerja kalau parent-nya sendiri punya
            // batas tinggi yang benar-benar mengikat (flex column di sini).
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* key={group.key} — SheetBody mount ulang tiap kali grup yang dibuka
          berganti, drillStack di dalamnya otomatis reset ke level 2 lewat
          remount (bukan useEffect+setState, dilarang lint react-hooks/set-
          state-in-effect proyek ini). */}
      {group && (
        <SheetBody key={group.key} group={group} onClose={onClose} onNavigate={onNavigate} canSee={canSee} />
      )}
    </SwipeableDrawer>
  );
};

function SheetBody({
  group,
  onClose,
  onNavigate,
  canSee,
}: {
  group: MobileNavGroup;
  onClose: () => void;
  onNavigate: (path: string) => void;
  canSee: (permissionKey?: string) => boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [drillStack, setDrillStack] = useState<NavItem[]>([]);
  // Ref (bukan state selama render) — dibaca/ditulis MURNI di dalam pointer
  // event handler, tidak pernah selama render, jadi aman terhadap lint
  // react-hooks/refs proyek ini (larangan itu soal .current selama render,
  // bukan soal event handler).
  const swipeRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    committed: boolean;
    rejected: boolean;
  } | null>(null);

  const currentLevel: NavItem[] = drillStack.length === 0
    ? group.children
    : (drillStack[drillStack.length - 1].children ?? []);
  const visibleItems = currentLevel.filter((item) => canSee(item.permissionKey));
  const title = drillStack.length === 0 ? group.labelKey : drillStack[drillStack.length - 1].labelKey;
  const depthKey = drillStack.map((i) => i.key).join('.');

  const handleItemClick = (item: NavItem) => {
    const hasVisibleChildren = (item.children ?? []).some((c) => canSee(c.permissionKey));
    if (hasVisibleChildren) {
      setDrillStack((prev) => [...prev, item]);
      return;
    }
    onNavigate(item.path);
    onClose();
  };

  // Mundur satu tingkat (level 3 -> 2), atau tutup sheet sepenuhnya kalau
  // sudah di tingkat paling luar (level 2 -> tertutup) — persis spesifikasi
  // user, dipicu swipe kiri (handlePointerUp) ATAU tombol panah kiri papan
  // ketik (aksesibilitas, pengganti tombol back yang sengaja dihapus).
  const goBack = () => {
    if (drillStack.length > 0) {
      setDrillStack((prev) => prev.slice(0, -1));
    } else {
      onClose();
    }
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    swipeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastTime: e.timeStamp,
      velocity: 0,
      committed: false,
      rejected: false,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipeRef.current;
    if (!s || s.rejected) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const stepDx = e.clientX - s.lastX;
    const dt = e.timeStamp - s.lastTime;
    s.lastX = e.clientX;
    s.lastTime = e.timeStamp;
    if (dt > 0) s.velocity = stepDx / dt; // px/ms, negatif = ke kiri

    if (!s.committed) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_ACTIVATION_THRESHOLD_PX) return; // masih dalam touch-slop, belum diputuskan
      // Dominan vertikal (biarkan scroll List / swipe-turun-tutup bawaan
      // SwipeableDrawer yang menangani) ATAU bergerak ke KANAN (bukan
      // gestur "mundur") — tolak, jangan pernah dievaluasi ulang di touch ini.
      if (Math.abs(dy) >= Math.abs(dx) || dx > 0) {
        s.rejected = true;
        return;
      }
      s.committed = true;
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || !s.committed) return; // cuma tap, scroll biasa, atau gestur ditolak — tidak ada yang perlu dilakukan
    const dx = e.clientX - s.startX;
    const isDecisiveFlick = s.velocity < -SWIPE_BACK_VELOCITY_FLOOR;
    if (dx <= -SWIPE_BACK_DISTANCE_PX || isDecisiveFlick) goBack();
  };

  const handlePointerCancel = () => {
    swipeRef.current = null;
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Panah kiri — padanan keyboard utk swipe kiri (aksesibilitas: tombol
    // back visual sengaja dihapus per instruksi user, jangan sampai
    // pengguna keyboard/switch-control kehilangan cara mundur sama sekali).
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    }
  };

  return (
    // display:flex+flexDirection:column+minHeight:0 — Paper pembungkus (lihat
    // NavigationSheet) sudah flex column + overflow:hidden, Box ini WAJIB ikut
    // pola yang sama supaya drag handle+judul+divider tetap diam di atas
    // (flexShrink:0 bawaan block element) dan cuma area List di bawah yang
    // flex:1+overflowY:auto — itu satu-satunya cara overflow beneran scroll,
    // bukan tumpah keluar batas sheet.
    <Box
      sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      {/* Drag handle — juga penanda visual "ini bisa digeser", meski gestur
          swipe aktif di seluruh isi sheet (bukan cuma pegangan ini). */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.25, pb: 0.5, flexShrink: 0 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
      </Box>

      {/* Judul saja, TANPA tombol close/back (instruksi user: "itu tidak
          terkesan natif") — mundur pakai swipe kiri, tutup pakai swipe turun
          (bawaan SwipeableDrawer) atau tombol Escape (bawaan MUI Modal). */}
      <Box sx={{ px: 2, pb: 1, flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t(title)}
        </Typography>
      </Box>
      <Divider sx={{ flexShrink: 0 }} />

      <Box
        key={depthKey}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          ...(!prefersReducedMotion && {
            '@keyframes mobileNavSheetSlideIn': {
              from: { transform: 'translateX(16px)', opacity: 0 },
              to: { transform: 'translateX(0)', opacity: 1 },
            },
            animation: 'mobileNavSheetSlideIn 180ms ease-out',
          }),
        }}
      >
        <List
          dense
          disablePadding
          sx={{
            py: 0.5,
            // Clearance setinggi nav bar (sekarang di DEPAN sheet, lihat
            // komentar zIndex di NavigationSheet) + safe-area — tanpa ini,
            // item paling bawah rendernya ketutup nav bar walau sudah
            // discroll sampai mentok.
            pb: `calc(${MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
          }}
        >
          {visibleItems.map((item) => {
            const active = isPathActive(item.path, location.pathname);
            const hasVisibleChildren = (item.children ?? []).some((c) => canSee(c.permissionKey));
            return (
              <ListItemButton
                key={item.key}
                onClick={() => handleItemClick(item)}
                selected={active}
                sx={{
                  minHeight: 48,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: 2, color: active ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={t(item.labelKey)}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      sx: { fontWeight: active ? 600 : 400, color: active ? 'primary.main' : 'text.primary' },
                    },
                  }}
                />
                {hasVisibleChildren && <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
}
