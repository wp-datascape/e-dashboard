import type { ReactNode } from 'react';
import MenuIcon from '@mui/icons-material/Menu';

import { NAV_ITEMS, type NavItem, isPathActive } from './menu';

/** Tinggi bar bottom nav (tanpa safe-area) — dipakai DashboardLayout utk
 * ruang bawah konten/footer, dan NavigationSheet utk padding-bottom list
 * (task034 revisi: nav bar sengaja DI DEPAN sheet secara z-index, jadi list
 * butuh clearance setinggi ini biar item terakhir tidak ketutup nav bar). */
export const MOBILE_BOTTOM_NAV_HEIGHT = 56;

export interface MobileNavGroup {
  key: string;
  path: string;
  labelKey: string;
  icon: ReactNode;
  /** Kosong = leaf, tap di bottom nav langsung navigasi. Ada isi = tap
   * membuka bottom sheet (task034). */
  children: NavItem[];
}

// Bottom nav cuma py 5 slot tetap (task034, instruksi user) — 6 top-level
// NAV_ITEMS yang tidak dapat slot sendiri (Settings/Config/Access Control/
// Log/Info & Panduan/Bantuan) digabung jadi 1 bucket "Menu". 4 di antaranya
// (settings/config/access-control/log) py children sendiri, jadi drill-down
// level 3 pakai data ASLI, bukan contoh buatan.
const MENU_BUCKET_KEYS = ['settings', 'config', 'access-control', 'log', 'whats-new', 'help'];

function findNavItem(key: string): NavItem {
  const item = NAV_ITEMS.find((i) => i.key === key);
  if (!item) {
    throw new Error(`buildMobileNavGroups: NAV_ITEMS tidak punya key "${key}"`);
  }
  return item;
}

/**
 * Turunkan 5 bucket bottom navigation LANGSUNG dari NAV_ITEMS (single source
 * of truth yang sama dipakai Sidebar desktop) — bukan struktur paralel yang
 * didaftar ulang manual, supaya perubahan menu.tsx otomatis ikut di sini
 * tanpa perlu disinkronkan dua kali.
 */
export function buildMobileNavGroups(): MobileNavGroup[] {
  const dashboard = findNavItem('dashboard');
  const business = findNavItem('business');
  const data = findNavItem('data');
  const report = findNavItem('report');
  const menuChildren = NAV_ITEMS.filter((i) => MENU_BUCKET_KEYS.includes(i.key));

  return [
    { key: dashboard.key, path: dashboard.path, labelKey: dashboard.labelKey, icon: dashboard.icon, children: [] },
    { key: business.key, path: business.path, labelKey: business.labelKey, icon: business.icon, children: business.children ?? [] },
    { key: data.key, path: data.path, labelKey: data.labelKey, icon: data.icon, children: data.children ?? [] },
    { key: report.key, path: report.path, labelKey: report.labelKey, icon: report.icon, children: report.children ?? [] },
    { key: 'mobile-menu', path: '', labelKey: 'nav.mobileMenu', icon: <MenuIcon fontSize="small" />, children: menuChildren },
  ];
}

/** Cek apakah satu bucket bottom nav dianggap "aktif" — leaf dicek langsung,
 * grup dicek dari children (termasuk cucu di dalam children, mis. Settings
 * di dalam bucket "Menu") supaya highlight tab tetap benar walau lagi di
 * halaman turunan yang dalam. */
export function isGroupActive(group: MobileNavGroup, pathname: string): boolean {
  if (group.children.length === 0) return isPathActive(group.path, pathname);
  return group.children.some((child) => isNavItemActiveDeep(child, pathname));
}

function isNavItemActiveDeep(item: NavItem, pathname: string): boolean {
  if (isPathActive(item.path, pathname)) return true;
  return (item.children ?? []).some((c) => isPathActive(c.path, pathname));
}
