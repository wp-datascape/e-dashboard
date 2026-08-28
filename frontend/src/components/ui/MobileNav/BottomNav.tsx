import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';

import { buildMobileNavGroups, isGroupActive, MOBILE_BOTTOM_NAV_HEIGHT, type MobileNavGroup } from '@/config/mobileNav';
import { isNavItemVisible } from '@/config/menu';
import { useAuth } from '@/context/auth.context';
import { NavigationSheet } from './NavigationSheet';

export { MOBILE_BOTTOM_NAV_HEIGHT };

/** Bottom navigation mobile (task034) — 5 tombol tetap diturunkan dari
 * NAV_ITEMS (config/mobileNav.ts), TIDAK menggantikan Sidebar desktop, cuma
 * dirender sebagai pengganti Sidebar drawer khusus saat isMobile. Tap item
 * tanpa anak langsung navigasi; tap item beranak membuka NavigationSheet
 * (bottom sheet drill-down). */
export const MobileBottomNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = useAuth();
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

  const canSee = (permissionKey?: string) => !permissionKey || permissions.includes(permissionKey);

  const groups = useMemo<MobileNavGroup[]>(() => {
    return buildMobileNavGroups()
      .map((group) => ({ ...group, children: group.children.filter((c) => isNavItemVisible(c, canSee)) }))
      .filter((group) => group.children.length > 0 || group.key === 'dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- permissions dari useAuth stabil per-render login, canSee re-created tiap render sengaja tidak masuk deps
  }, [permissions]);

  const openGroup = groups.find((g) => g.key === openGroupKey) ?? null;
  const activeKey = groups.find((g) => isGroupActive(g, location.pathname))?.key ?? false;

  const handleTap = (group: MobileNavGroup) => {
    if (group.children.length === 0) {
      navigate(group.path);
      return;
    }
    setOpenGroupKey(group.key);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          // theme.zIndex.drawer + 1 — instruksi user: nav bar TETAP terlihat
          // di depan/atas sheet, tidak boleh ketutup saat sheet terbuka.
          // NavigationSheet (SwipeableDrawer) dipasang persis theme.zIndex.drawer
          // (lebih rendah, eksplisit) supaya bar ini SELALU menang secara
          // numerik — JANGAN disamakan ke nilai yang sama: browser lalu jatuh ke
          // tie-break urutan DOM (drawer di-portal ke body SETELAH root app,
          // jadi menang meski z-index numerik sama — pernah terjadi, nav bar
          // hilang total di balik sheet meski keduanya "1200").
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation value={activeKey} showLabels sx={{ height: MOBILE_BOTTOM_NAV_HEIGHT, bgcolor: 'background.paper' }}>
          {groups.map((group) => (
            <BottomNavigationAction
              key={group.key}
              value={group.key}
              label={t(group.labelKey)}
              icon={group.icon}
              onClick={() => handleTap(group)}
              sx={{
                minWidth: 0,
                px: 0.5,
                color: 'text.secondary',
                '&.Mui-selected': { color: 'primary.main' },
                '& .MuiBottomNavigationAction-label': { fontSize: '0.68rem', '&.Mui-selected': { fontSize: '0.68rem' } },
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>

      <NavigationSheet
        group={openGroup}
        onClose={() => setOpenGroupKey(null)}
        onNavigate={navigate}
        canSee={canSee}
      />
    </>
  );
};
