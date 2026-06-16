import type { ReactNode } from 'react';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SecurityIcon from '@mui/icons-material/Security';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';

export interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  icon: ReactNode;
  dividerBefore?: boolean; // opsional: tampilkan divider sebelum item ini
}

export const NAV_ITEMS: NavItem[] = [
  // ── Analitik ──────────────────────────────────────────────────────────────
  {
    key: 'dashboard',
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: <DashboardIcon fontSize="small" />,
  },
  {
    key: 'cross-selling',
    path: '/cross-selling',
    labelKey: 'nav.crossSelling',
    icon: <SwapHorizIcon fontSize="small" />,
  },
  {
    key: 'customer-metrics',
    path: '/customer-metrics',
    labelKey: 'nav.customerMetrics',
    icon: <BarChartIcon fontSize="small" />,
  },
  {
    key: 'dormant-customer',
    path: '/dormant-customer',
    labelKey: 'nav.dormantCustomer',
    icon: <PersonOffIcon fontSize="small" />,
  },

  // ── Operasional ───────────────────────────────────────────────────────────
  {
    key: 'import',
    path: '/import',
    labelKey: 'nav.import',
    icon: <UploadFileIcon fontSize="small" />,
    dividerBefore: true,
  },

  // ── Administrasi ──────────────────────────────────────────────────────────
  {
    key: 'users',
    path: '/users',
    labelKey: 'nav.users',
    icon: <ManageAccountsIcon fontSize="small" />,
    dividerBefore: true,
  },
  {
    key: 'rbac',
    path: '/rbac',
    labelKey: 'nav.rbac',
    icon: <SecurityIcon fontSize="small" />,
  },
  {
    key: 'config',
    path: '/config',
    labelKey: 'nav.config',
    icon: <TuneIcon fontSize="small" />,
  },
  {
    key: 'audit-log',
    path: '/audit-log',
    labelKey: 'nav.auditLog',
    icon: <HistoryIcon fontSize="small" />,
  },
];
