import type { ReactNode } from 'react';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InventoryIcon from '@mui/icons-material/Inventory';
import StarIcon from '@mui/icons-material/Star';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EngineeringIcon from '@mui/icons-material/Engineering';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SecurityIcon from '@mui/icons-material/Security';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import BusinessIcon from '@mui/icons-material/Business';

export interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  icon: ReactNode;
  /** Tampilkan label grup di atas item ini (hanya saat sidebar expanded) */
  groupLabel?: string;
}

export const NAV_ITEMS: NavItem[] = [

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 1: EXECUTIVE DASHBOARD — Makro (Core/Utama)
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'dashboard',
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: <DashboardIcon fontSize="small" />,
    groupLabel: 'Executive Dashboard',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 2: CUSTOMER WORKBENCH — Mikro (Who)
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'customers',
    path: '/customers',
    labelKey: 'nav.customers',
    icon: <PeopleIcon fontSize="small" />,
    groupLabel: 'Customer Workbench',
  },
  {
    key: 'customers-expansion',
    path: '/customer-metrics',
    labelKey: 'nav.expansionTargets',
    icon: <TrendingUpIcon fontSize="small" />,
  },
  {
    key: 'dormant-customer',
    path: '/dormant-customer',
    labelKey: 'nav.churnRisk',
    icon: <PersonOffIcon fontSize="small" />,
  },
  {
    key: 'cross-selling',
    path: '/cross-selling',
    labelKey: 'nav.crossSellMatrix',
    icon: <SwapHorizIcon fontSize="small" />,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 3: PRODUCT & PORTFOLIO WORKBENCH — Mikro (What)
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'products',
    path: '/products',
    labelKey: 'nav.productLedger',
    icon: <InventoryIcon fontSize="small" />,
    groupLabel: 'Product & Portfolio',
  },
  {
    key: 'products-high-margin',
    path: '/products/high-margin',
    labelKey: 'nav.highMarginPush',
    icon: <StarIcon fontSize="small" />,
  },
  {
    key: 'products-trend',
    path: '/products/trend',
    labelKey: 'nav.productTrend',
    icon: <ShowChartIcon fontSize="small" />,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 4: TRANSACTION & REVENUE WORKBENCH — Mikro (Event)
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'transactions',
    path: '/transactions',
    labelKey: 'nav.orderLedger',
    icon: <ReceiptLongIcon fontSize="small" />,
    groupLabel: 'Transaction & Revenue',
  },
  {
    key: 'projects',
    path: '/projects',
    labelKey: 'nav.projectMilestone',
    icon: <EngineeringIcon fontSize="small" />,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 5: ADMIN
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'import',
    path: '/import',
    labelKey: 'nav.import',
    icon: <UploadFileIcon fontSize="small" />,
    groupLabel: 'Admin',
  },
  {
    key: 'users',
    path: '/users',
    labelKey: 'nav.users',
    icon: <ManageAccountsIcon fontSize="small" />,
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
  {
    key: 'companies',
    path: '/companies',
    labelKey: 'nav.companies',
    icon: <BusinessIcon fontSize="small" />,
  },
];
