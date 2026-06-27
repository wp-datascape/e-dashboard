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
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ApiIcon from '@mui/icons-material/Api';
import ExtensionIcon from '@mui/icons-material/Extension';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  icon: ReactNode;
  /** Permission key to check, e.g. 'customers:menu'. Undefined = always visible */
  permissionKey?: string;
  /** Tampilkan label grup di atas item ini (hanya saat sidebar expanded) */
  groupLabel?: string;
  /** Sub-menu items — render sebagai collapsible nested list */
  children?: Omit<NavItem, 'groupLabel' | 'children'>[];
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
    permissionKey: 'metrics:menu',
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
    permissionKey: 'customers:menu',
    groupLabel: 'Customer Workbench',
  },
  {
    key: 'customers-expansion',
    path: '/customer-metrics',
    labelKey: 'nav.expansionTargets',
    icon: <TrendingUpIcon fontSize="small" />,
    permissionKey: 'customers:menu',
  },
  {
    key: 'dormant-customer',
    path: '/dormant-customer',
    labelKey: 'nav.churnRisk',
    icon: <PersonOffIcon fontSize="small" />,
    permissionKey: 'customers:menu',
  },
  {
    key: 'cross-selling',
    path: '/cross-selling',
    labelKey: 'nav.crossSellMatrix',
    icon: <SwapHorizIcon fontSize="small" />,
    permissionKey: 'customers:menu',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 3: PRODUCT & PORTFOLIO WORKBENCH — Mikro (What)
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'products',
    path: '/products',
    labelKey: 'nav.productLedger',
    icon: <InventoryIcon fontSize="small" />,
    permissionKey: 'products:menu',
    groupLabel: 'Product & Portfolio',
  },
  {
    key: 'products-high-margin',
    path: '/products/high-margin',
    labelKey: 'nav.highMarginPush',
    icon: <StarIcon fontSize="small" />,
    permissionKey: 'products:menu',
  },
  {
    key: 'products-trend',
    path: '/products/trend',
    labelKey: 'nav.productTrend',
    icon: <ShowChartIcon fontSize="small" />,
    permissionKey: 'products:menu',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 4: TRANSACTION & REVENUE WORKBENCH — Mikro (Event)
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'transactions',
    path: '/transactions',
    labelKey: 'nav.orderLedger',
    icon: <ReceiptLongIcon fontSize="small" />,
    permissionKey: 'transactions:menu',
    groupLabel: 'Transaction & Revenue',
  },
  {
    key: 'projects',
    path: '/projects',
    labelKey: 'nav.projectMilestone',
    icon: <EngineeringIcon fontSize="small" />,
    permissionKey: 'transactions:menu',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 5: ADMIN
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'settings',
    path: '/settings/app',
    labelKey: 'nav.settings',
    icon: <TuneIcon fontSize="small" />,
    groupLabel: 'Admin',
    children: [
      {
        key: 'settings-app',
        path: '/settings/app',
        labelKey: 'nav.settingsApp',
        icon: <DisplaySettingsIcon fontSize="small" />,
        permissionKey: 'config:menu',
      },
      {
        key: 'companies',
        path: '/companies',
        labelKey: 'nav.companies',
        icon: <BusinessIcon fontSize="small" />,
        permissionKey: 'companies:manage',
      },
      {
        key: 'settings-divisions',
        path: '/settings/divisions',
        labelKey: 'nav.settingsDivisions',
        icon: <AccountTreeIcon fontSize="small" />,
        permissionKey: 'config:menu',
      },
      {
        key: 'settings-high-margin',
        path: '/settings/high-margin',
        labelKey: 'nav.settingsHighMargin',
        icon: <AutoGraphIcon fontSize="small" />,
        permissionKey: 'config:menu',
      },
      {
        key: 'settings-threshold',
        path: '/settings/threshold',
        labelKey: 'nav.settingsThreshold',
        icon: <TuneIcon fontSize="small" />,
        permissionKey: 'config:menu',
      },
    ],
  },
  {
    key: 'config',
    path: '/settings/classification',
    labelKey: 'nav.config',
    icon: <AdminPanelSettingsIcon fontSize="small" />,
    children: [
      {
        key: 'settings-classification',
        path: '/settings/classification',
        labelKey: 'nav.settingsClassification',
        icon: <EngineeringIcon fontSize="small" />,
        permissionKey: 'config:menu',
      },
      {
        key: 'import',
        path: '/import',
        labelKey: 'nav.import',
        icon: <UploadFileIcon fontSize="small" />,
        permissionKey: 'import:menu',
      },
      {
        key: 'config-integration',
        path: '/config/integration',
        labelKey: 'nav.configIntegration',
        icon: <ApiIcon fontSize="small" />,
        permissionKey: 'config:menu',
      },
      {
        key: 'config-features',
        path: '/config/features',
        labelKey: 'nav.configFeatures',
        icon: <ExtensionIcon fontSize="small" />,
        permissionKey: 'config:menu',
      },
      {
        key: 'users',
        path: '/users',
        labelKey: 'nav.users',
        icon: <ManageAccountsIcon fontSize="small" />,
        permissionKey: 'users:menu',
      },
      {
        key: 'rbac',
        path: '/rbac',
        labelKey: 'nav.rbac',
        icon: <SecurityIcon fontSize="small" />,
        permissionKey: 'rbac:menu',
      },
    ],
  },
  {
    key: 'audit-log',
    path: '/audit-log',
    labelKey: 'nav.auditLog',
    icon: <HistoryIcon fontSize="small" />,
    permissionKey: 'audit:menu',
  },
];
