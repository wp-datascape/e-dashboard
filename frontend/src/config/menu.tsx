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
import CategoryIcon from '@mui/icons-material/Category';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import WebIcon from '@mui/icons-material/Web';
import LoginIcon from '@mui/icons-material/Login';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AssessmentIcon from '@mui/icons-material/Assessment';

export interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  icon: ReactNode;
  /** Permission key to check, e.g. 'customers:menu'. Undefined = always visible */
  permissionKey?: string;
  /** i18n key untuk label grup di atas item ini (hanya saat sidebar expanded) */
  groupLabelKey?: string;
  /** Sub-menu items — render sebagai collapsible nested list */
  children?: Omit<NavItem, 'groupLabelKey' | 'children'>[];
}

export const NAV_ITEMS: NavItem[] = [

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 1: EXECUTIVE DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'dashboard',
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: <DashboardIcon fontSize="small" />,
    permissionKey: 'dashboard:menu',
    groupLabelKey: 'nav.groups.executiveDashboard',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 2: CUSTOMER WORKBENCH
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'customer',
    path: '/customers',
    labelKey: 'nav.customers',
    icon: <PeopleIcon fontSize="small" />,
    permissionKey: 'customer:menu',
    groupLabelKey: 'nav.groups.customerWorkbench',
  },
  {
    key: 'expansion',
    path: '/customer-metrics',
    labelKey: 'nav.expansionTargets',
    icon: <TrendingUpIcon fontSize="small" />,
    permissionKey: 'expansion:menu',
  },
  {
    key: 'churn-risk',
    path: '/dormant-customer',
    labelKey: 'nav.churnRisk',
    icon: <PersonOffIcon fontSize="small" />,
    permissionKey: 'churn.risk:menu',
  },
  {
    key: 'cross-selling',
    path: '/cross-selling',
    labelKey: 'nav.crossSellMatrix',
    icon: <SwapHorizIcon fontSize="small" />,
    permissionKey: 'cross.selling:menu',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 3: PRODUCT & PORTFOLIO
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'product',
    path: '/products',
    labelKey: 'nav.productLedger',
    icon: <InventoryIcon fontSize="small" />,
    permissionKey: 'product:menu',
    groupLabelKey: 'nav.groups.productPortfolio',
  },
  {
    key: 'high-margin',
    path: '/products/high-margin',
    labelKey: 'nav.highMarginPush',
    icon: <StarIcon fontSize="small" />,
    permissionKey: 'high.margin:menu',
  },
  {
    key: 'product-trend',
    path: '/products/trend',
    labelKey: 'nav.productTrend',
    icon: <ShowChartIcon fontSize="small" />,
    permissionKey: 'product.trend:menu',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 4: TRANSACTION & REVENUE
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'transaction',
    path: '/transactions',
    labelKey: 'nav.transactionLedger',
    icon: <ReceiptLongIcon fontSize="small" />,
    permissionKey: 'transaction:menu',
    groupLabelKey: 'nav.groups.transactionRevenue',
  },
  {
    key: 'analisis',
    path: '/analisis',
    labelKey: 'nav.analisis',
    icon: <AssessmentIcon fontSize="small" />,
    permissionKey: 'analisis:menu',
  },
  {
    key: 'project',
    path: '/projects',
    labelKey: 'nav.projectMilestone',
    icon: <EngineeringIcon fontSize="small" />,
    permissionKey: 'project:menu',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 5: ADMINISTRATION
  // ─────────────────────────────────────────────────────────────────────────

  // Settings — collapsible
  {
    key: 'settings',
    path: '/settings/app',
    labelKey: 'nav.settings',
    icon: <TuneIcon fontSize="small" />,
    groupLabelKey: 'nav.groups.administration',
    children: [
      {
        key: 'settings-app',
        path: '/settings/app',
        labelKey: 'nav.settingsApp',
        icon: <DisplaySettingsIcon fontSize="small" />,
        permissionKey: 'settings.app:menu',
      },
      {
        key: 'settings-company',
        path: '/companies',
        labelKey: 'nav.companies',
        icon: <BusinessIcon fontSize="small" />,
        permissionKey: 'settings.company:menu',
      },
      {
        key: 'settings-channel-division',
        path: '/settings/divisions',
        labelKey: 'nav.settingsDivisions',
        icon: <AccountTreeIcon fontSize="small" />,
        permissionKey: 'settings.channel.division:menu',
      },
      {
        key: 'settings-division-management',
        path: '/settings/division-management',
        labelKey: 'nav.settingsDivisionManagement',
        icon: <CategoryIcon fontSize="small" />,
        permissionKey: 'settings.division:menu',
      },
      {
        key: 'settings-customer-intercompany',
        path: '/settings/customer-intercompany',
        labelKey: 'nav.settingsCustomerIntercompany',
        icon: <CompareArrowsIcon fontSize="small" />,
        permissionKey: 'settings.intercompany:menu',
      },
      {
        key: 'settings-product',
        path: '/settings/high-margin',
        labelKey: 'nav.settingsHighMargin',
        icon: <AutoGraphIcon fontSize="small" />,
        permissionKey: 'settings.product:menu',
      },
      {
        key: 'settings-threshold',
        path: '/settings/threshold',
        labelKey: 'nav.settingsThreshold',
        icon: <TuneIcon fontSize="small" />,
        permissionKey: 'settings.threshold:menu',
      },
      {
        key: 'settings-pareto-customers',
        path: '/settings/pareto-customers',
        labelKey: 'nav.settingsParetoCustomers',
        icon: <WorkspacePremiumIcon fontSize="small" />,
        permissionKey: 'settings.pareto:menu',
      },
    ],
  },

  // Configuration — collapsible
  {
    key: 'config',
    path: '/settings/classification',
    labelKey: 'nav.config',
    icon: <AdminPanelSettingsIcon fontSize="small" />,
    children: [
      {
        key: 'config-classification',
        path: '/settings/classification',
        labelKey: 'nav.settingsClassification',
        icon: <EngineeringIcon fontSize="small" />,
        permissionKey: 'config.classification:menu',
      },
      {
        key: 'config-import',
        path: '/import',
        labelKey: 'nav.import',
        icon: <UploadFileIcon fontSize="small" />,
        permissionKey: 'config.import:menu',
      },
      {
        key: 'config-integration',
        path: '/config/integration',
        labelKey: 'nav.configIntegration',
        icon: <ApiIcon fontSize="small" />,
        permissionKey: 'config.integration:menu',
      },
      {
        key: 'config-features',
        path: '/config/features',
        labelKey: 'nav.configFeatures',
        icon: <ExtensionIcon fontSize="small" />,
        permissionKey: 'config.features:menu',
      },
    ],
  },

  // Access Control — collapsible (Users + Roles; Permission = modal dalam RBAC)
  {
    key: 'access-control',
    path: '/users',
    labelKey: 'nav.accessControl',
    icon: <VpnKeyIcon fontSize="small" />,
    children: [
      {
        key: 'access-user',
        path: '/users',
        labelKey: 'nav.users',
        icon: <ManageAccountsIcon fontSize="small" />,
        permissionKey: 'access.user:menu',
      },
      {
        key: 'access-role',
        path: '/rbac',
        labelKey: 'nav.rbac',
        icon: <SecurityIcon fontSize="small" />,
        permissionKey: 'access.role:menu',
      },
      {
        key: 'access-ab-testing',
        path: '/ab-testing',
        labelKey: 'nav.abTesting',
        icon: <NetworkCheckIcon fontSize="small" />,
        permissionKey: 'access.ab_testing:menu',
      },
    ],
  },

  // Log — collapsible (Audit Log, Activity Log, Login Log)
  {
    key: 'log',
    path: '/audit-log',
    labelKey: 'nav.log',
    icon: <HistoryIcon fontSize="small" />,
    children: [
      {
        key: 'log-audit',
        path: '/audit-log',
        labelKey: 'nav.auditLog',
        icon: <HistoryIcon fontSize="small" />,
        permissionKey: 'audit.log:menu',
      },
      {
        key: 'log-activity',
        path: '/activity-log',
        labelKey: 'nav.activityLog',
        icon: <WebIcon fontSize="small" />,
        permissionKey: 'activity.log:menu',
      },
      {
        key: 'log-login',
        path: '/login-log',
        labelKey: 'nav.loginLog',
        icon: <LoginIcon fontSize="small" />,
        permissionKey: 'login.log:menu',
      },
    ],
  },
];
