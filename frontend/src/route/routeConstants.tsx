import { ReactNode } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Dashboard,
  Growth,
  Retention,
  Value,
  ReportGrowth,
  ReportRetention,
  ReportRevenue,
  Customers,
  CustomerMetrics,
  CrossSelling,
  DormantCustomer,
  Products,
  ProductsHighMargin,
  ProductsTrend,
  Transactions,
  Projects,
  Import,
  Users,
  RBAC,
  Config,
  AuditLog,
  ActivityLog,
  LoginLog,
  Companies,
  HighMarginSettings,
  DivisionsSettings,
  DivisionManagementSettings,
  CustomerIntercompanySettings,
  ClassificationSettings,
  ThresholdSettings,
  ParetoCustomersSettings,
  AnalisisPage,
  NotificationsPage,
  AppSettings,
  IntegrationPage,
  FeaturesPage,
  AbTesting,
} from './routeLazyComponents'

// Helper: wrap page in DashboardLayout
const withLayout = (page: ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
)

// ─── Route Registry Contract Type ────────────────────────────────────────────
export interface RouteRegistryItem {
  path: string
  element: ReactNode
  protected: boolean
  permissionKey?: string  // permission yang diperlukan untuk akses halaman ini
}

// ─── Route Registry Dictionary ───────────────────────────────────────────────
export const routeRegistry: Record<string, RouteRegistryItem> = {
  // ── Executive Dashboard ─────────────────────────────────────────────────
  'dashboard':            { path: '/dashboard',              element: withLayout(<Dashboard />),             protected: true, permissionKey: 'dashboard:view' },
  // Growth/Retention/Value (task029, 2026-08-19) — 1 menu, 1 halaman per
  // grup, reuse LANGSUNG komponen chart M1-M10 yg sudah ada di
  // cross-selling/customer-metrics/dormant-customer (bukan chart baru dari
  // /dashboard — percobaan pertama salah, sudah dikoreksi user).
  //
  // permissionKey pakai permission baru khusus per grup (growth:view/
  // retention:view/value:view, lihat backend/src/db/seed.ts) mengikuti pola
  // menu+view yang sudah ada di tiap halaman lain (bukan reuse dashboard:view
  // — itu punya Overview, endpoint beda).
  //
  // CATATAN: ini gerbang ROUTE level doang. Data yang benar-benar dipanggil
  // tiap halaman TETAP dicek independen oleh permission endpoint aslinya —
  // Growth: /metrics/cross-selling (cross.selling:view) + /metrics/
  // customer-metrics (expansion:view). Retention: /metrics/customer-metrics
  // + /metrics/dormant-customer (churn.risk:view). Value: /metrics/
  // customer-metrics. growth:view/dst tidak menggantikan pengecekan itu —
  // kalau user py2 growth:view tapi TIDAK py2 cross.selling:view/
  // expansion:view, halaman kebuka tapi chart-nya 403. ADMIN_PERMISSION_NAMES/
  // USER_PERMISSION_NAMES di seed.ts sudah include keduanya sekaligus jadi
  // tidak kejadian utk role default, tapi role custom bisa saja timpang —
  // belum ditangani di UI (misal: sembunyikan chart yang usernya tidak
  // berhak, bukan biarkan 403 polos), follow-up.
  'growth':               { path: '/growth',                 element: withLayout(<Growth />),                protected: true, permissionKey: 'growth:view' },
  'retention':            { path: '/retention',               element: withLayout(<Retention />),             protected: true, permissionKey: 'retention:view' },
  'value':                { path: '/value',                   element: withLayout(<Value />),                 protected: true, permissionKey: 'value:view' },
  // Laporan (task029.md §30.19, 2026-08-22) — tabel breakdown Growth/
  // Retention/Revenue, dipisah dari halaman chart. permissionKey REUSE
  // growth:view/retention:view/value:view (SAMA dgn chart-nya) — bukan
  // permission baru.
  'report-growth':        { path: '/report/growth',          element: withLayout(<ReportGrowth />),          protected: true, permissionKey: 'growth:view' },
  'report-retention':     { path: '/report/retention',       element: withLayout(<ReportRetention />),       protected: true, permissionKey: 'retention:view' },
  'report-revenue':       { path: '/report/revenue',         element: withLayout(<ReportRevenue />),         protected: true, permissionKey: 'value:view' },
  // ── Customer Workbench ───────────────────────────────────────────────────
  'customers':            { path: '/customers',              element: withLayout(<Customers />),             protected: true, permissionKey: 'customer:view' },
  'customers-expansion':  { path: '/customer-metrics',       element: withLayout(<CustomerMetrics />),       protected: true, permissionKey: 'expansion:view' },
  'cross-selling':        { path: '/cross-selling',          element: withLayout(<CrossSelling />),          protected: true, permissionKey: 'cross.selling:view' },
  'dormant-customer':     { path: '/dormant-customer',       element: withLayout(<DormantCustomer />),       protected: true, permissionKey: 'churn.risk:view' },
  // ── Product & Portfolio ──────────────────────────────────────────────────
  'products':             { path: '/products',               element: withLayout(<Products />),              protected: true, permissionKey: 'product:view' },
  'products-high-margin': { path: '/products/high-margin',   element: withLayout(<ProductsHighMargin />),    protected: true, permissionKey: 'high.margin:view' },
  'products-trend':       { path: '/products/trend',         element: withLayout(<ProductsTrend />),         protected: true, permissionKey: 'product.trend:view' },
  // ── Transaction & Revenue ────────────────────────────────────────────────
  'transactions':         { path: '/transactions',           element: withLayout(<Transactions />),          protected: true, permissionKey: 'transaction:view' },
  'projects':             { path: '/projects',               element: withLayout(<Projects />),              protected: true, permissionKey: 'project:view' },
  // permissionKey ikut backend saat ini (task025 rename: analisis:view ->
  // customer.revenue:view, lihat backend/src/features/analisis/analisis.route.ts)
  // — dibawa dari dev-legacy bareng backend, seed.ts py migrasi backward-compat
  // ('analisis:view' -> 'customer.revenue:view') tapi frontend langsung pakai
  // key final, tidak bergantung shim itu.
  'analisis':             { path: '/analisis',                element: withLayout(<AnalisisPage />),           protected: true, permissionKey: 'customer.revenue:view' },
  // Personal, tidak butuh permission spesifik — siapa pun yang login berhak
  // lihat notifikasi miliknya sendiri (di-scope by user_id di backend).
  'notifications':        { path: '/notifications',           element: withLayout(<NotificationsPage />),      protected: true, permissionKey: 'notifications:view' },
  // ── Administration — Settings ────────────────────────────────────────────
  'settings-app':         { path: '/settings/app',           element: withLayout(<AppSettings />),           protected: true, permissionKey: 'settings.app:view' },
  'companies':            { path: '/companies',              element: withLayout(<Companies />),             protected: true, permissionKey: 'settings.company:view' },
  'settings-divisions':   { path: '/settings/divisions',     element: withLayout(<DivisionsSettings />),     protected: true, permissionKey: 'settings.channel.division:view' },
  'settings-division-management':    { path: '/settings/division-management',   element: withLayout(<DivisionManagementSettings />),    protected: true, permissionKey: 'settings.division:view' },
  'settings-customer-intercompany':  { path: '/settings/customer-intercompany', element: withLayout(<CustomerIntercompanySettings />),  protected: true, permissionKey: 'settings.intercompany:view' },
  'settings-high-margin': { path: '/settings/high-margin',   element: withLayout(<HighMarginSettings />),    protected: true, permissionKey: 'settings.product:view' },
  'settings-threshold':   { path: '/settings/threshold',     element: withLayout(<ThresholdSettings />),     protected: true, permissionKey: 'settings.threshold:view' },
  'settings-pareto-customers': { path: '/settings/pareto-customers', element: withLayout(<ParetoCustomersSettings />), protected: true, permissionKey: 'settings.pareto:view' },
  // ── Administration — Configuration ───────────────────────────────────────
  'settings-classification': { path: '/settings/classification', element: withLayout(<ClassificationSettings />), protected: true, permissionKey: 'config.classification:view' },
  'import':               { path: '/import',                 element: withLayout(<Import />),                protected: true, permissionKey: 'config.import:view' },
  'config-integration':   { path: '/config/integration',     element: withLayout(<IntegrationPage />),       protected: true, permissionKey: 'config.integration:view' },
  'config-features':      { path: '/config/features',        element: withLayout(<FeaturesPage />),          protected: true, permissionKey: 'config.features:view' },
  // ── Administration — Access Control ──────────────────────────────────────
  'users':                { path: '/users',                  element: withLayout(<Users />),                 protected: true, permissionKey: 'access.user:view' },
  'rbac':                 { path: '/rbac',                   element: withLayout(<RBAC />),                  protected: true, permissionKey: 'access.role:view' },
  'ab-testing':           { path: '/ab-testing',              element: withLayout(<AbTesting />),             protected: true, permissionKey: 'access.ab_testing:view' },
  // ── Administration — Log ──────────────────────────────────────────────────
  'audit-log':            { path: '/audit-log',              element: withLayout(<AuditLog />),              protected: true, permissionKey: 'audit.log:view' },
  'activity-log':         { path: '/activity-log',            element: withLayout(<ActivityLog />),           protected: true, permissionKey: 'activity.log:view' },
  'login-log':            { path: '/login-log',               element: withLayout(<LoginLog />),              protected: true, permissionKey: 'login.log:view' },
  // ── Legacy (backward compat — tidak di menu) ─────────────────────────────
  'config':               { path: '/config',                 element: withLayout(<Config />),                protected: true },
}
