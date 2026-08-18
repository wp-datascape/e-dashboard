import type { ReactNode } from 'react';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InventoryIcon from '@mui/icons-material/Inventory';
import StarIcon from '@mui/icons-material/Star';
import LayersIcon from '@mui/icons-material/Layers';
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
import ReplayIcon from '@mui/icons-material/Replay';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PaidIcon from '@mui/icons-material/Paid';
import PieChartIcon from '@mui/icons-material/PieChart';

export interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  icon: ReactNode;
  /** Permission key to check, e.g. 'customers:menu'. Undefined = always visible */
  permissionKey?: string;
  /** i18n key untuk label grup di atas item ini (hanya saat sidebar expanded) */
  groupLabelKey?: string;
  /** i18n key untuk caption mini DI DALAM grup yang sama (bukan grup baru) —
   * penanda tier "Ringkasan/Tren" vs "Detail per Customer" dst. Beda dari
   * groupLabelKey: tidak didahului Divider, font lebih kecil/ringan — supaya
   * kebaca sebagai sub-penanda dalam 1 grup, BUKAN batas grup baru. Sengaja
   * TIDAK bikin grup collapsible baru (lihat task023 §3a) — itu akan
   * membalik keputusan task021 §0b yang eksplisit melarang grup "Analisis"
   * terpisah lagi. */
  tierLabelKey?: string;
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
  // GROUP: GROWTH / RETENTION / VALUE — 10 KPI dikelompokkan ulang per
  // framework bisnis (task029, 2026-08-19), GANTIKAN skema "Statistik"
  // 3-grup by jenis-data (Omset&Revenue/Produk/Transaksi, task026 Fase 3)
  // yang tidak disukai user ("terlalu ramai dan tidak terkesan profesional",
  // hasil critique 2026-08-18) — pemetaan PERSIS docs-v2/task/task029.md §2:
  //   Growth    = M1 Cross Selling, M2 Avg Category, M7 Customer Expansion
  //   Retention = M6 Repeat Order, M8 Dormant Rate, M9 Dormant Value,
  //               M10 Reactivation Rate
  //   Value     = M3 Customer Revenue, M4 Customer Gross Profit,
  //               M5 High Margin Penetration
  // Tanpa parent menu "Matrix" — Growth/Retention/Value SEJAJAR dgn
  // Overview (task029 §1, draft awal sempat pakai Matrix sbg parent,
  // ditolak user). Path/permission tiap child TIDAK berubah dari skema
  // lama — cuma pengelompokan grup yang berubah, routing & RBAC tetap.
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'growth',
    path: '/cross-selling',
    labelKey: 'nav.groups.growth',
    icon: <TrendingUpIcon fontSize="small" />,
    groupLabelKey: 'nav.groups.growth',
    children: [
      { key: 'growth-cross-selling',             path: '/cross-selling',             labelKey: 'nav.crossSellMatrix',        icon: <SwapHorizIcon fontSize="small" />, permissionKey: 'cross.selling:menu' },
      { key: 'growth-avg-category-per-customer', path: '/avg-category-per-customer', labelKey: 'nav.avgCategoryPerCustomer', icon: <LayersIcon fontSize="small" />, permissionKey: 'cross.selling:menu' },
      { key: 'growth-customer-expansion',        path: '/customer-expansion',        labelKey: 'nav.customerExpansion',      icon: <TrendingUpIcon fontSize="small" />, permissionKey: 'customer.expansion:menu' },
    ],
  },
  {
    key: 'retention',
    path: '/repeat-order',
    labelKey: 'nav.groups.retention',
    icon: <AutorenewIcon fontSize="small" />,
    groupLabelKey: 'nav.groups.retention',
    children: [
      { key: 'retention-repeat-order',      path: '/repeat-order',      labelKey: 'nav.repeatOrder',      icon: <ReplayIcon fontSize="small" />, permissionKey: 'repeat.order:menu' },
      { key: 'retention-dormant-rate',      path: '/dormant-rate',      labelKey: 'nav.dormantRate',      icon: <PersonOffIcon fontSize="small" />, permissionKey: 'churn.risk:menu' },
      { key: 'retention-dormant-value',     path: '/dormant-value',     labelKey: 'nav.dormantValue',     icon: <MoneyOffIcon fontSize="small" />, permissionKey: 'churn.risk:menu' },
      { key: 'retention-reactivation-rate', path: '/reactivation-rate', labelKey: 'nav.reactivationRate', icon: <AutorenewIcon fontSize="small" />, permissionKey: 'churn.risk:menu' },
    ],
  },
  {
    key: 'value',
    path: '/customer-revenue',
    labelKey: 'nav.groups.value',
    icon: <PaidIcon fontSize="small" />,
    groupLabelKey: 'nav.groups.value',
    children: [
      { key: 'value-customer-revenue',      path: '/customer-revenue',      labelKey: 'nav.customerRevenue',      icon: <AssessmentIcon fontSize="small" />, permissionKey: 'customer.revenue:menu' },
      { key: 'value-customer-gross-profit', path: '/customer-gross-profit', labelKey: 'nav.customerGrossProfit', icon: <PaidIcon fontSize="small" />, permissionKey: 'customer.gross.profit:menu' },
      { key: 'value-high-margin-penetration', path: '/high-margin-penetration', labelKey: 'nav.highMarginPenetration', icon: <PieChartIcon fontSize="small" />, permissionKey: 'high.margin.penetration:menu' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP: REPORT — DIHAPUS (2026-08-10, instruksi user "standar yang sama
  // dari layout dan filtering" utk 9 KPI lain, mengikuti pola
  // CustomerGrossProfit/KPI4 yang SUDAH lebih dulu di-revert task026 §8: 1
  // halaman gabungan chart+tabel, TANPA prop `mode` / route `/report/*`
  // terpisah). 9 halaman KPI lain sekarang SAMA — `/report/*` jadi
  // duplikat murni dari route Statistik (komponen sama persis, tidak ada
  // lagi bedanya), jadi grup nav ini dibuang, bukan cuma disembunyikan.
  // Route `/report/*` di routeConstants.tsx ikut dihapus (lihat komentar di
  // sana). `page_settings` row `report-*` yang sudah ke-seed DIBIARKAN ada
  // di DB (harmless, tidak match registry manapun lagi) — belum dibersihkan,
  // sama persis preseden KPI4.
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP 2: CUSTOMER WORKBENCH — mikro "siapa yang beli", beda scope dari
  // 10 KPI makro di atas (CLAUDE.md). Isinya menyempit jadi cuma "Customer"
  // (list mentah) setelah 10 KPI dipindah ke 4 grup domain bisnis di atas.
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'customer',
    path: '/customers',
    labelKey: 'nav.customers',
    icon: <PeopleIcon fontSize="small" />,
    permissionKey: 'customer:menu',
    groupLabelKey: 'nav.groups.customerWorkbench',
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
