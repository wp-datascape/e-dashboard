import type { ReactNode } from 'react';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InventoryIcon from '@mui/icons-material/Inventory';
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
import SummarizeIcon from '@mui/icons-material/Summarize';
import StorageIcon from '@mui/icons-material/Storage';

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

  // Susulan (2026-08-22, instruksi user: "coba hilangkan judul section dan
  // divider, jadi langsung overview") — SEMUA `groupLabelKey` di file ini
  // dilepas (bukan cuma yang ini) — Sidebar.tsx cuma render header teks +
  // Divider KALAU `section.groupLabelKey` truthy, jadi tanpa itu, TIDAK
  // ada header/divider sama sekali, item-item mengalir jadi 1 list rapi.
  // Business/Data yang tadinya "section flat py judul" (§30.20) DIUBAH JADI
  // parent collapsible (pola sama Report/Settings) — satu-satunya cara
  // tetap mengelompokkan visual tanpa judul section, lihat blok di bawah.
  {
    key: 'dashboard',
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: <DashboardIcon fontSize="small" />,
    permissionKey: 'dashboard:menu',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BUSINESS (task029 §30.20, direvisi 2026-08-22 — instruksi user: "menu
  // business, sub menu growth, retention, revenue"). SEBELUMNYA "section
  // flat" (item terpisah py `groupLabelKey` sama, §30.20) — sekarang parent
  // COLLAPSIBLE (pola sama Report/Settings di bawah), Growth/Retention/
  // Revenue jadi children-nya. Diperlukan krn judul section+divider
  // dihapus total (lihat comment di 'dashboard' di atas) — tanpa jadi
  // parent+children, 3 item ini akan mengalir polos tanpa pengelompokan
  // visual apa pun.
  //
  // 'value' (child ketiga) — labelKey TETAP `nav.groups.revenue` ("Revenue",
  // instruksi user 2026-08-22 sebelumnya) — key/path/permission internal
  // TETAP 'value'/'/value'/'value:menu' (rename permission/route di luar
  // scope, cuma label tampilan yang berubah).
  //
  // 10 KPI dikelompokkan per framework bisnis (docs-v2/task/task029.md
  // §1-2). 1 menu per grup (2026-08-19) — REUSE LANGSUNG komponen chart
  // M1-M10 yang sudah ada di cross-selling/customer-metrics/dormant-customer
  // (M1CrossSelling, M2AvgCategory, M3Revenue, dst), BUKAN chart baru dari
  // data ringkas /dashboard. Permission PAKAI permission khusus per grup
  // (growth:menu/retention:menu/value:menu — lihat seed.ts). CATATAN: ini
  // gerbang level menu/route doang — endpoint data yang dipanggil tiap
  // halaman (cross.selling:view, expansion:view, churn.risk:view) TETAP
  // dicek independen oleh backend-nya masing-masing, lihat routeConstants.tsx.
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'business',
    path: '/growth',
    labelKey: 'nav.groups.business',
    icon: <BusinessIcon fontSize="small" />,
    children: [
      {
        key: 'growth',
        path: '/growth',
        labelKey: 'nav.groups.growth',
        icon: <TrendingUpIcon fontSize="small" />,
        permissionKey: 'growth:menu',
      },
      {
        key: 'retention',
        path: '/retention',
        labelKey: 'nav.groups.retention',
        icon: <PersonOffIcon fontSize="small" />,
        permissionKey: 'retention:menu',
      },
      {
        key: 'value',
        path: '/value',
        labelKey: 'nav.groups.revenue',
        icon: <AssessmentIcon fontSize="small" />,
        permissionKey: 'value:menu',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REPORT (task029.md §30.19, 2026-08-22) — tabel breakdown yang dulu
  // nempel permanen di bawah chart Growth (§29) DIPINDAH ke sini (koreksi
  // keras user: "terlalu kotor jika chart digabung dengan tabel", "buatkan
  // saja halaman khusus tabel"). Submenu Retention/Revenue baru shell/
  // placeholder — isinya "nanti kita maping tabel-tabel apa saja yang kita
  // masukkan disana" (instruksi user, BELUM diputuskan tabel mana yang
  // pindah ke situ, Retention/Value tidak py tabel breakdown permanen sama
  // sekali sejauh ini, cuma dialog drill-down klik-chart).
  // permissionKey children REUSE growth:menu/retention:menu/value:menu
  // (permission yang SAMA dgn halaman chart-nya) — bukan permission baru,
  // supaya tidak perlu migrasi/seed tambahan: kalau bisa lihat chart
  // Growth, bisa lihat tabel Growth.
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'report',
    path: '/report/growth',
    labelKey: 'nav.groups.report',
    icon: <SummarizeIcon fontSize="small" />,
    children: [
      {
        key: 'report-growth',
        path: '/report/growth',
        labelKey: 'nav.groups.growth',
        icon: <TrendingUpIcon fontSize="small" />,
        permissionKey: 'growth:menu',
      },
      {
        key: 'report-retention',
        path: '/report/retention',
        labelKey: 'nav.groups.retention',
        icon: <PersonOffIcon fontSize="small" />,
        permissionKey: 'retention:menu',
      },
      {
        key: 'report-revenue',
        path: '/report/revenue',
        labelKey: 'nav.groups.revenue',
        icon: <AssessmentIcon fontSize="small" />,
        permissionKey: 'value:menu',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DATA (task029 §30.20, direvisi 2026-08-22 — instruksi user: "menu data,
  // sub menu customer, produk, high margin, tren produk (hapus ini,
  // redundan dengan retention), transaksi, proyek"). SEBELUMNYA "section
  // flat" — sekarang parent COLLAPSIBLE (sama alasan dgn Business di atas).
  // 'product-trend' (Tren Produk) DIHAPUS dari sini (instruksi eksplisit
  // user: redundan dgn Retention) — HANYA dilepas dari MENU/sidebar, route
  // `/products/trend` TIDAK dihapus dari routeConstants.tsx/page_settings
  // (pola sama halaman lama lain di file ini — "isinya sama, cuma sudah
  // tidak ada entry langsung di sidebar").
  // 'high-margin' (task031.md §10, 2026-08-26 — instruksi user: "pindahkan
  // ke menu laporan") DIHAPUS dari sini SAMA PERSIS pola 'product-trend' —
  // isinya (tab Penetrasi Produk + Target Upsell) sudah digabung jadi
  // sub-tab Report/Revenue -> "hm", route `/products/high-margin` TETAP
  // ada (tidak dihapus dari routeConstants.tsx), cuma tidak ada entry
  // langsung di sidebar lagi.
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'data',
    path: '/customers',
    labelKey: 'nav.groups.data',
    icon: <StorageIcon fontSize="small" />,
    children: [
      {
        key: 'customer',
        path: '/customers',
        labelKey: 'nav.customers',
        icon: <PeopleIcon fontSize="small" />,
        permissionKey: 'customer:menu',
      },
      {
        key: 'product',
        path: '/products',
        labelKey: 'nav.productLedger',
        icon: <InventoryIcon fontSize="small" />,
        permissionKey: 'product:menu',
      },
      {
        key: 'transaction',
        path: '/transactions',
        labelKey: 'nav.transactionLedger',
        icon: <ReceiptLongIcon fontSize="small" />,
        permissionKey: 'transaction:menu',
      },
      {
        key: 'project',
        path: '/projects',
        labelKey: 'nav.projectMilestone',
        icon: <EngineeringIcon fontSize="small" />,
        permissionKey: 'project:menu',
      },
    ],
  },

  // Settings — collapsible
  {
    key: 'settings',
    path: '/settings/app',
    labelKey: 'nav.settings',
    icon: <TuneIcon fontSize="small" />,
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
