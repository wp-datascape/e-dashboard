import { db } from '@/config/db'
import { company_branches, users, pageSettings, companies, roles, permissions, userRoles, userCompanies, userBranches, userDivisions, rolePermissions, businessConfigs, divisions } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { eq, and, inArray } from 'drizzle-orm'
import { seedDefaultDivisions, MKO_DIVISIONS_TEMPLATE } from '@/features/settings/divisions.repository'

const defaultCompanies = [
  { code: 'PT MKO', name: 'PT Mesin Kasir Online' },
  { code: 'PT KNT', name: 'PT Kode Niaga Tama' },
  { code: 'PT SKI', name: 'PT Solusi Kartu Indonesia' },
]

const defaultBranches = [
  // PT MKO — 3 branch riil (Jakarta, Surabaya) + 1 bucket "Lainnya" untuk invoice
  // tanpa info branch dari Accurate (ditemukan lewat audit Task A5, 2026-07-06 —
  // awalnya cuma di-seed 1 branch "Pusat" yang keliru, bukan branch riil).
  { company_code: 'PT MKO', name: 'Lainnya', code: 'LAINNYA', is_active: true },
  { company_code: 'PT MKO', name: 'Jakarta', code: 'JKT', is_active: true },
  { company_code: 'PT MKO', name: 'Surabaya', code: 'SBY', is_active: true },
  // PT KNT — 3 branches
  { company_code: 'PT KNT', name: 'Surabaya Timur', code: 'SBT', is_active: true },
  { company_code: 'PT KNT', name: 'Surabaya Barat', code: 'SBB', is_active: true },
  { company_code: 'PT KNT', name: 'Jakarta', code: 'JKT', is_active: true },
  { company_code: 'PT KNT', name: 'Semarang', code: 'SMG', is_active: true },
  // PT SKI — 1 branch (Pusat)
  { company_code: 'PT SKI', name: 'Pusat', code: 'PUSAT', is_active: true },
]

const defaultRoles = [
  { name: 'superadmin', description: 'Full access to all features', is_system: true },
  { name: 'admin', description: 'Administrative access', is_system: false },
  { name: 'user', description: 'User access', is_system: false },
]

// Permission keys lama yang digantikan oleh struktur baru
const OLD_PERMISSION_NAMES = [
  'metrics:menu', 'metrics:view',
  'customers:menu', 'customers:view', 'customers:input', 'customers:update', 'customers:delete',
  'customers-expansion:menu', 'customers-expansion:view',
  'dormant-customer:menu', 'dormant-customer:view',
  'cross-selling:menu', 'cross-selling:view',
  'products:menu', 'products:view', 'products:input', 'products:update', 'products:delete',
  'products-high-margin:menu', 'products-high-margin:view',
  'products-trend:menu', 'products-trend:view',
  'transactions:menu', 'transactions:view', 'transactions:input', 'transactions:update', 'transactions:delete',
  'projects:menu', 'projects:view',
  'import:menu', 'import:view', 'import:input',
  'users:menu', 'users:view', 'users:input', 'users:update', 'users:delete',
  'rbac:menu', 'rbac:view', 'rbac:input', 'rbac:update', 'rbac:delete',
  'config:menu',
  'settings-classification:menu', 'settings-classification:view',
  'config-integration:menu', 'config-integration:view', 'config-integration:update',
  'config-features:menu', 'config-features:view', 'config-features:update',
  'audit:menu', 'audit:view',
  'companies:menu', 'companies:view', 'companies:input', 'companies:update', 'companies:delete',
  'settings:menu',
  'settings-app:menu', 'settings-app:view',
  'settings-divisions:menu', 'settings-divisions:view', 'settings-divisions:input', 'settings-divisions:update', 'settings-divisions:delete',
  'settings-high-margin:menu', 'settings-high-margin:view', 'settings-high-margin:input', 'settings-high-margin:update', 'settings-high-margin:delete',
  'settings-threshold:menu', 'settings-threshold:view', 'settings-threshold:update',
  'order:menu', 'order:view', 'order:export',
]

const defaultPermissions = [
  // ── Executive Dashboard ────────────────────────────────────────────────
  { name: 'dashboard:menu',   description: 'Menu Dashboard',   category: 'Dashboard' },
  { name: 'dashboard:view',   description: 'View Dashboard',   category: 'Dashboard' },

  // ── Growth / Retention / Value (task029, 2026-08-19) ────────────────────
  // Gate ROUTE/menu level utk 3 halaman baru (1 menu, 1 halaman per grup).
  // CATATAN: ini BUKAN permission tunggal yang menggantikan permission
  // data yang sudah ada — tiap halaman reuse chart & endpoint lama, yang
  // masing-masing TETAP dicek sendiri (mis. Growth manggil /metrics/
  // cross-selling [cross.selling:view] + /metrics/customer-metrics
  // [expansion:view]). growth:view/retention:view/value:view cuma gerbang
  // "boleh buka halaman ini", bukan pengganti gerbang data yang sudah ada
  // di endpoint masing-masing — lihat routeConstants.tsx utk detail.
  { name: 'growth:menu',      description: 'Menu Growth',      category: 'Growth' },
  { name: 'growth:view',      description: 'View Growth',      category: 'Growth' },
  { name: 'retention:menu',   description: 'Menu Retention',   category: 'Retention' },
  { name: 'retention:view',   description: 'View Retention',   category: 'Retention' },
  { name: 'value:menu',       description: 'Menu Value',       category: 'Value' },
  { name: 'value:view',       description: 'View Value',       category: 'Value' },

  // ── Customer Workbench ─────────────────────────────────────────────────
  { name: 'customer:menu',        description: 'Menu Customer List',        category: 'Customer' },
  { name: 'customer:view',        description: 'View Customer List',        category: 'Customer' },
  { name: 'expansion:menu',       description: 'Menu Customer Expansion',   category: 'Expansion' },
  { name: 'expansion:view',       description: 'View Customer Expansion',   category: 'Expansion' },
  { name: 'expansion:export',     description: 'Export Customer Expansion', category: 'Expansion' },
  { name: 'churn.risk:menu',      description: 'Menu Churn Risk',           category: 'Churn Risk' },
  { name: 'churn.risk:view',      description: 'View Churn Risk',           category: 'Churn Risk' },
  { name: 'churn.risk:export',    description: 'Export Churn Risk',         category: 'Churn Risk' },
  { name: 'cross.selling:menu',   description: 'Menu Cross Selling',        category: 'Cross Selling' },
  { name: 'cross.selling:view',   description: 'View Cross Selling',        category: 'Cross Selling' },
  { name: 'cross.selling:export', description: 'Export Cross Selling',      category: 'Cross Selling' },

  // ── Product & Portfolio ────────────────────────────────────────────────
  { name: 'product:menu',         description: 'Menu Product Ledger',      category: 'Product' },
  { name: 'product:view',         description: 'View Product Ledger',      category: 'Product' },
  { name: 'product:export',       description: 'Export Product Ledger',    category: 'Product' },
  { name: 'high.margin:menu',     description: 'Menu High Margin Push',    category: 'High Margin' },
  { name: 'high.margin:view',     description: 'View High Margin Push',    category: 'High Margin' },
  { name: 'high.margin:export',   description: 'Export High Margin Push',  category: 'High Margin' },
  { name: 'product.trend:menu',   description: 'Menu Product Trend',       category: 'Product Trend' },
  { name: 'product.trend:view',   description: 'View Product Trend',       category: 'Product Trend' },
  { name: 'product.trend:export', description: 'Export Product Trend',     category: 'Product Trend' },

  // ── Transaction & Revenue ──────────────────────────────────────────────
  { name: 'transaction:menu',    description: 'Menu Transactions',         category: 'Transaction' },
  { name: 'transaction:view',    description: 'View Transactions',         category: 'Transaction' },
  { name: 'transaction:export',  description: 'Export Transactions',       category: 'Transaction' },
  { name: 'project:menu',  description: 'Menu Project Milestone',    category: 'Project' },
  { name: 'project:view',  description: 'View Project Milestone',    category: 'Project' },
  { name: 'project:export', description: 'Export Project Milestone', category: 'Project' },

  // ── Settings ───────────────────────────────────────────────────────────
  { name: 'settings.app:menu',    description: 'Menu App Settings',   category: 'App Settings' },
  { name: 'settings.app:view',    description: 'View App Settings',   category: 'App Settings' },
  { name: 'settings.app:update',  description: 'Update App Settings', category: 'App Settings' },
  // Company — halaman /companies (Company + Branch dalam 1 halaman)
  { name: 'settings.company:menu',   description: 'Menu Company',   category: 'Company' },
  { name: 'settings.company:view',   description: 'View Company',   category: 'Company' },
  { name: 'settings.company:create', description: 'Create Company', category: 'Company' },
  { name: 'settings.company:update', description: 'Update Company', category: 'Company' },
  { name: 'settings.company:delete', description: 'Delete Company', category: 'Company' },
  // Branch — sub-fitur dalam halaman Company (bukan halaman terpisah)
  { name: 'settings.branch:view',   description: 'View Branch',   category: 'Branch' },
  { name: 'settings.branch:create', description: 'Create Branch', category: 'Branch' },
  { name: 'settings.branch:update', description: 'Update Branch', category: 'Branch' },
  { name: 'settings.branch:delete', description: 'Delete Branch', category: 'Branch' },
  // Channel Division
  { name: 'settings.channel.division:menu',   description: 'Menu Channel Division',   category: 'Channel Division' },
  { name: 'settings.channel.division:view',   description: 'View Channel Division',   category: 'Channel Division' },
  { name: 'settings.channel.division:create', description: 'Create Channel Division', category: 'Channel Division' },
  { name: 'settings.channel.division:update', description: 'Update Channel Division', category: 'Channel Division' },
  { name: 'settings.channel.division:delete', description: 'Delete Channel Division', category: 'Channel Division' },
  // Division CRUD (task012 v2) — permission TERPISAH dari settings.channel.division:*
  // (yang cuma mapping channel->division) karena division menyentuh RBAC/scope akses
  // user lain, sengaja dipisah biar lebih ketat. Halaman sendiri sejak task014
  // (dulu sub-widget di Settings/Divisions, tanpa :menu sendiri).
  { name: 'settings.division:menu',   description: 'Menu Division Management', category: 'Division' },
  { name: 'settings.division:view',   description: 'View Division',   category: 'Division' },
  { name: 'settings.division:create', description: 'Create Division', category: 'Division' },
  { name: 'settings.division:update', description: 'Update Division', category: 'Division' },
  { name: 'settings.division:delete', description: 'Delete Division', category: 'Division' },
  // Sister Company Names / Customer Intercompany (task013, halaman sendiri +
  // is_active sejak task014) — daftar nama customer yang representasi sister
  // company per company, sync otomatis ke customers.division_override_id.
  { name: 'settings.intercompany:menu',   description: 'Menu Customer Intercompany',   category: 'Division' },
  { name: 'settings.intercompany:view',   description: 'View Sister Company Names',   category: 'Division' },
  { name: 'settings.intercompany:create', description: 'Create Sister Company Name',  category: 'Division' },
  { name: 'settings.intercompany:update', description: 'Update Sister Company Name',  category: 'Division' },
  { name: 'settings.intercompany:delete', description: 'Delete Sister Company Name',  category: 'Division' },
  // Product Settings (High Margin mapping)
  { name: 'settings.product:menu',   description: 'Menu Product Settings', category: 'Product Settings' },
  { name: 'settings.product:view',   description: 'View Product Settings', category: 'Product Settings' },
  { name: 'settings.product:create', description: 'Create Product Setting', category: 'Product Settings' },
  { name: 'settings.product:update', description: 'Update Product Setting', category: 'Product Settings' },
  { name: 'settings.product:delete', description: 'Delete Product Setting', category: 'Product Settings' },
  // Threshold
  { name: 'settings.threshold:menu',   description: 'Menu Threshold Config',   category: 'Threshold' },
  { name: 'settings.threshold:view',   description: 'View Threshold Config',   category: 'Threshold' },
  { name: 'settings.threshold:update', description: 'Update Threshold Config', category: 'Threshold' },
  // Pareto Customer Monitoring (task016 Fase A) — flagging customer prioritas +
  // laporan on-demand. Threshold-nya SENGAJA reuse permission settings.threshold:*
  // di atas (tampil di halaman Settings/Threshold yang sama, bukan halaman baru).
  { name: 'settings.pareto:menu',   description: 'Menu Pareto Customer',   category: 'Pareto Customer' },
  { name: 'settings.pareto:view',   description: 'View Pareto Customer',   category: 'Pareto Customer' },
  { name: 'settings.pareto:create', description: 'Create Pareto Customer', category: 'Pareto Customer' },
  { name: 'settings.pareto:update', description: 'Update Pareto Customer', category: 'Pareto Customer' },
  { name: 'settings.pareto:delete', description: 'Delete Pareto Customer', category: 'Pareto Customer' },
  // KPI3 "Jumlah pelanggan loyal" (task025 §12, 2026-08-07) — RENAME dari
  // analisis:menu/:view (halaman /analisis/revenue dipensiunkan jadi
  // redirect ke /customer-revenue, tabelnya diboyong ke sini). Permission
  // lama TIDAK dihapus dari DB (harmless), tapi role yang py2 punya
  // analisis:*/expansion:* di-backfill otomatis (lihat migratePermissions()
  // di bawah) supaya tidak ada yang kehilangan akses diam-diam.
  { name: 'customer.revenue:menu',   description: 'Menu Customer Revenue (KPI3)',   category: 'Customer Revenue' },
  { name: 'customer.revenue:view',   description: 'View Customer Revenue (KPI3)',   category: 'Customer Revenue' },
  { name: 'customer.revenue:export', description: 'Export Customer Revenue (KPI3)', category: 'Customer Revenue' },
  // KPI4 "Keuntungan pelanggan loyal" — BARU, sebelumnya bagian dari
  // expansion:* (chart+dialog GP tergabung di bundel /customer-metrics).
  { name: 'customer.gross.profit:menu',   description: 'Menu Customer Gross Profit (KPI4)',   category: 'Customer Gross Profit' },
  { name: 'customer.gross.profit:view',   description: 'View Customer Gross Profit (KPI4)',   category: 'Customer Gross Profit' },
  { name: 'customer.gross.profit:export', description: 'Export Customer Gross Profit (KPI4)', category: 'Customer Gross Profit' },
  // KPI5 "Pembelian produk fokus" / High Margin Penetration — BARU. SENGAJA
  // beda dari high.margin:* (itu "High Margin Push" di Product & Portfolio,
  // konsep beda: push = tracking produk, penetration = % customer beli).
  { name: 'high.margin.penetration:menu',   description: 'Menu High Margin Penetration (KPI5)',   category: 'High Margin Penetration' },
  { name: 'high.margin.penetration:view',   description: 'View High Margin Penetration (KPI5)',   category: 'High Margin Penetration' },
  { name: 'high.margin.penetration:export', description: 'Export High Margin Penetration (KPI5)', category: 'High Margin Penetration' },
  // KPI6 "Pembelian berulang" — RENAME dari analisis.retention:menu/:view
  // (halaman /analisis/retention dipensiunkan jadi redirect ke /repeat-order).
  { name: 'repeat.order:menu',   description: 'Menu Repeat Order (KPI6)',   category: 'Repeat Order' },
  { name: 'repeat.order:view',   description: 'View Repeat Order (KPI6)',   category: 'Repeat Order' },
  { name: 'repeat.order:export', description: 'Export Repeat Order (KPI6)', category: 'Repeat Order' },
  // KPI7 "Peningkatan nilai belanja" / Customer Expansion Rate — BARU.
  // SENGAJA beda dari expansion:* lama (yang itu gate bundel CHART M3-M7,
  // dipertahankan HANYA utk endpoint chart gabungan /metrics/customer-metrics).
  { name: 'customer.expansion:menu',   description: 'Menu Customer Expansion (KPI7)',   category: 'Customer Expansion' },
  { name: 'customer.expansion:view',   description: 'View Customer Expansion (KPI7)',   category: 'Customer Expansion' },
  { name: 'customer.expansion:export', description: 'Export Customer Expansion (KPI7)', category: 'Customer Expansion' },
  // Notification Center (task016 §19) — SEBELUMNYA tanpa permission sama
  // sekali ("siapa pun login boleh akses", personal by user_id). Diubah biar
  // konsisten dgn pola menu lain: 'notifications:menu' kontrol visibilitas
  // ikon lonceng di AppBar (BUKAN Sidebar — notifications memang tidak
  // punya entry sidebar, cuma dipicu ikon header), 'notifications:view'
  // kontrol akses halaman /notifications + SEMUA endpoint API-nya (403 kalau
  // tidak punya, sama seperti fitur lain).
  { name: 'notifications:menu', description: 'Menu Notifikasi', category: 'Notifications' },
  { name: 'notifications:view', description: 'View Notifikasi', category: 'Notifications' },

  // ── Configuration ──────────────────────────────────────────────────────
  { name: 'config.classification:menu',   description: 'Menu Classification Rules', category: 'Classification' },
  { name: 'config.classification:view',   description: 'View Classification Rules', category: 'Classification' },
  { name: 'config.classification:create', description: 'Create Classification Rule', category: 'Classification' },
  { name: 'config.classification:update', description: 'Update Classification Rule', category: 'Classification' },
  { name: 'config.classification:delete', description: 'Delete Classification Rule', category: 'Classification' },
  { name: 'config.import:menu',    description: 'Menu Import',          category: 'Import' },
  { name: 'config.import:view',    description: 'View Import Log',      category: 'Import' },
  { name: 'config.import:import',  description: 'Upload & Import File', category: 'Import' },
  { name: 'config.integration:menu',   description: 'Menu Integration Config',       category: 'Integration' },
  { name: 'config.integration:view',   description: 'View Integration Config',       category: 'Integration' },
  { name: 'config.integration:create', description: 'Create Integration Credential', category: 'Integration' },
  { name: 'config.integration:update', description: 'Update Integration Credential', category: 'Integration' },
  { name: 'config.integration:reset',  description: 'Reset Integration Token',       category: 'Integration' },
  { name: 'config.integration:delete', description: 'Delete Integration Credential', category: 'Integration' },
  { name: 'config.integration:test',   description: 'Test Integration Connection',   category: 'Integration' },
  { name: 'config.features:menu',   description: 'Menu Features Toggle', category: 'Features' },
  { name: 'config.features:view',   description: 'View Features Toggle', category: 'Features' },
  { name: 'config.features:update', description: 'Toggle Feature',       category: 'Features' },

  // ── Access Control ─────────────────────────────────────────────────────
  { name: 'access.user:menu',   description: 'Menu Users',  category: 'Users' },
  { name: 'access.user:view',   description: 'View Users',  category: 'Users' },
  { name: 'access.user:create', description: 'Create User', category: 'Users' },
  { name: 'access.user:update', description: 'Update User', category: 'Users' },
  { name: 'access.user:delete', description: 'Delete User', category: 'Users' },
  // Task002 Task C4 — permission TERPISAH dari access.user:update (bukan reuse) supaya
  // bisa di-assign granular (mis. role support yang cuma boleh unlock, bukan full update)
  { name: 'access.user:unlock', description: 'Unlock User Account', category: 'Users' },
  { name: 'access.role:menu',   description: 'Menu Roles',  category: 'Roles' },
  { name: 'access.role:view',   description: 'View Roles',  category: 'Roles' },
  { name: 'access.role:create', description: 'Create Role', category: 'Roles' },
  { name: 'access.role:update', description: 'Update Role', category: 'Roles' },
  { name: 'access.role:delete', description: 'Delete Role', category: 'Roles' },
  // Permission — sub-fitur dalam halaman RBAC (bukan halaman terpisah)
  { name: 'access.permission:view',   description: 'View Permissions',  category: 'Permissions' },
  { name: 'access.permission:create', description: 'Create Permission', category: 'Permissions' },
  { name: 'access.permission:update', description: 'Update Permission', category: 'Permissions' },
  { name: 'access.permission:delete', description: 'Delete Permission', category: 'Permissions' },
  // AB Testing — toggle simulasi network 3G/4G GLOBAL (semua user), sengaja
  // TIDAK dimasukkan ke ADMIN_PERMISSION_NAMES/USER_PERMISSION_NAMES (superadmin-only
  // by default), sama seperti Configuration (Classification/Import/Integration/Features)
  // — mempengaruhi pengalaman SEMUA user yang sedang login, bukan cuma diri sendiri.
  { name: 'access.ab_testing:menu',   description: 'Menu AB Testing',            category: 'AB Testing' },
  { name: 'access.ab_testing:view',   description: 'View AB Testing Setting',    category: 'AB Testing' },
  { name: 'access.ab_testing:update', description: 'Update AB Testing Setting',  category: 'AB Testing' },

  // ── Audit Log ──────────────────────────────────────────────────────────
  { name: 'audit.log:menu',   description: 'Menu Audit Log',   category: 'Audit Log' },
  { name: 'audit.log:view',   description: 'View Audit Log',   category: 'Audit Log' },
  { name: 'audit.log:export', description: 'Export Audit Log', category: 'Audit Log' },

  // ── Activity Log ───────────────────────────────────────────────────────
  { name: 'activity.log:menu', description: 'Menu Activity Log', category: 'Activity Log' },
  { name: 'activity.log:view', description: 'View Activity Log', category: 'Activity Log' },

  // ── Login Log ──────────────────────────────────────────────────────────
  { name: 'login.log:menu', description: 'Menu Login Log', category: 'Login Log' },
  { name: 'login.log:view', description: 'View Login Log', category: 'Login Log' },
]

// Baseline permission untuk role 'admin' — akses penuh (menu+view+create+update+
// delete+export bila ada) di semua menu bisnis inti (Dashboard, Customer Workbench,
// Product & Portfolio, Transaction & Revenue). Untuk grup Administration: cuma
// sampai Settings (beberapa di antaranya view+update saja, TANPA create/delete —
// Company/Branch, Channel Division, Product Settings — karena hapus data master
// ini berdampak besar ke data transaksi/riwayat). Configuration (Classification,
// Import, Integration, Features) sengaja TIDAK dimasukkan — hak khusus superadmin.
// Access Control (Users/Roles/Permissions) & Audit Log: view-only, admin bisa
// lihat tapi tidak bisa memanipulasi data.
const ADMIN_PERMISSION_NAMES = [
  'dashboard:menu', 'dashboard:view',
  'growth:menu', 'growth:view',
  'retention:menu', 'retention:view',
  'value:menu', 'value:view',
  'customer:menu', 'customer:view',
  'expansion:menu', 'expansion:view', 'expansion:export',
  'churn.risk:menu', 'churn.risk:view', 'churn.risk:export',
  'cross.selling:menu', 'cross.selling:view', 'cross.selling:export',
  'product:menu', 'product:view', 'product:export',
  'high.margin:menu', 'high.margin:view', 'high.margin:export',
  'product.trend:menu', 'product.trend:view', 'product.trend:export',
  'transaction:menu', 'transaction:view', 'transaction:export',
  'project:menu', 'project:view', 'project:export',
  'settings.app:menu', 'settings.app:view', 'settings.app:update',
  'settings.company:menu', 'settings.company:view', 'settings.company:update',
  'settings.branch:view', 'settings.branch:update',
  'settings.channel.division:menu', 'settings.channel.division:view', 'settings.channel.division:update',
  'settings.division:menu', 'settings.division:view', 'settings.division:update',
  'settings.intercompany:menu', 'settings.intercompany:view', 'settings.intercompany:create', 'settings.intercompany:update', 'settings.intercompany:delete',
  'settings.product:menu', 'settings.product:view', 'settings.product:update',
  'settings.threshold:menu', 'settings.threshold:view', 'settings.threshold:update',
  'settings.pareto:menu', 'settings.pareto:view', 'settings.pareto:create', 'settings.pareto:update', 'settings.pareto:delete',
  // KPI3-7 (task025 §12) — rename analisis:*/analisis.retention:* +
  // pemecahan expansion:* jadi 5 permission spesifik per-KPI.
  'customer.revenue:menu', 'customer.revenue:view', 'customer.revenue:export',
  'customer.gross.profit:menu', 'customer.gross.profit:view', 'customer.gross.profit:export',
  'high.margin.penetration:menu', 'high.margin.penetration:view', 'high.margin.penetration:export',
  'repeat.order:menu', 'repeat.order:view', 'repeat.order:export',
  'customer.expansion:menu', 'customer.expansion:view', 'customer.expansion:export',
  // Alert notifikasi (task016) cuma dikirim ke admin/superadmin (recipients.ts)
  // — user biasa tidak pernah dapat isinya, jadi sengaja TIDAK dimasukkan ke
  // USER_PERMISSION_NAMES (bell yang selalu kosong cuma bikin bingung).
  'notifications:menu', 'notifications:view',
  'audit.log:menu', 'audit.log:view',
  'activity.log:menu', 'activity.log:view',
  'login.log:menu', 'login.log:view',
]

// Baseline permission untuk role 'user' — view + export saja di menu bisnis inti,
// tidak ada create/update/delete apa pun, dan TIDAK ADA satu pun menu Administration
// (Settings/Configuration/Access Control/Audit Log semuanya di luar jangkauan).
const USER_PERMISSION_NAMES = [
  'dashboard:menu', 'dashboard:view',
  'growth:menu', 'growth:view',
  'retention:menu', 'retention:view',
  'value:menu', 'value:view',
  'customer:menu', 'customer:view',
  'expansion:menu', 'expansion:view', 'expansion:export',
  // KPI4/5/7 (task025 §12) — role 'user' py2 punya expansion:view (yg dulu
  // sekaligus gate dialog GP/HM/Expansion breakdown), jadi 3 permission
  // baru ini di-tambahkan supaya AKSES TIDAK BERKURANG. customer.revenue &
  // repeat.order SENGAJA TIDAK ditambahkan — role 'user' memang dari awal
  // TIDAK punya analisis:*/analisis.retention:* (cuma admin), jadi tetap
  // konsisten dgn batasan akses yang sudah ada.
  'customer.gross.profit:menu', 'customer.gross.profit:view', 'customer.gross.profit:export',
  'high.margin.penetration:menu', 'high.margin.penetration:view', 'high.margin.penetration:export',
  'customer.expansion:menu', 'customer.expansion:view', 'customer.expansion:export',
  'churn.risk:menu', 'churn.risk:view', 'churn.risk:export',
  'cross.selling:menu', 'cross.selling:view', 'cross.selling:export',
  'product:menu', 'product:view', 'product:export',
  'high.margin:menu', 'high.margin:view', 'high.margin:export',
  'product.trend:menu', 'product.trend:view', 'product.trend:export',
  'transaction:menu', 'transaction:view', 'transaction:export',
  'project:menu', 'project:view', 'project:export',
]

const defaultUsers = [
  { name: 'Super Admin', email: 'admin@mail.com', password: '123456' },
  { name: 'Executive Admin', email: 'executif@mail.com', password: '123456' },
  { name: 'User', email: 'user@mail.com', password: '123456' },
]

const defaultBusinessConfigs = [
  { key: 'active_window_months', value: '1', description: 'Window bulan aktif: customer dianggap aktif jika ada transaksi dalam N bulan terakhir' },
  { key: 'dormant_threshold_months.b2b_dc', value: '3', description: 'Threshold dormant untuk B2B DC (bulan)' },
  { key: 'dormant_threshold_months.b2b_project', value: '12', description: 'Threshold dormant untuk B2B Project (bulan) — cycle project lebih panjang' },
  { key: 'dormant_threshold_months.b2c', value: '6', description: 'Threshold dormant untuk B2C (bulan)' },
  { key: 'dormant_threshold_months.manufacturing', value: '6', description: 'Threshold dormant untuk Manufacturing (bulan)' },
  { key: 'repeat_order_target_pct', value: '80', description: 'Target Repeat Order Rate M6 (%) — persentase minimum existing customer yang harus repeat order dalam 30 hari' },
  { key: 'dormant_rate_alert_pct', value: '10', description: 'Ambang batas M8 Dormant Rate (%) — di atas nilai ini grafik tampil peringatan merah' },
  { key: 'reactivation_target_low_pct', value: '15', description: 'Target minimum M10 Customer Reactivation Rate (%) — batas bawah zona hijau' },
  { key: 'reactivation_target_high_pct', value: '20', description: 'Target ideal M10 Customer Reactivation Rate (%) — batas atas zona hijau' },
  { key: 'branch_division_enforcement_enabled', value: 'true', description: 'Isolasi akses Branch/Division — "true" berarti user non-superadmin dibatasi ke branch/division yang di-assign, "false" cuma company scope yang berlaku' },
  { key: 'accurate_sync_enabled', value: 'false', description: 'Tombol "Sync Now" (sinkronisasi otomatis faktur dari Accurate Online) di halaman Import — nonaktif secara default, nyalakan hanya setelah integrasi sinkronisasi selesai dikonfigurasi' },
  { key: 'network_throttle_mode', value: 'off', description: 'Simulasi kondisi network (off/3g/4g/offline) utk testing - GLOBAL, mempengaruhi SEMUA user yang sedang akses aplikasi, bukan cuma browser admin sendiri. Menu: Access Control > AB Testing.' },
  { key: 'network_throttle_delay_3g_ms', value: '1500', description: 'Besaran delay (ms) untuk mode 3G di AB Testing - bisa diubah dari halaman Access Control > AB Testing' },
  { key: 'network_throttle_delay_4g_ms', value: '300', description: 'Besaran delay (ms) untuk mode 4G di AB Testing - bisa diubah dari halaman Access Control > AB Testing' },
]

const defaultPageSettings = [
  { page_key: 'dashboard', ready: true },
  { page_key: 'customers', ready: true },
  // 'customers-expansion' (bundel M3-M7 lama, /customer-metrics) dipecah
  // jadi 5 halaman task025 §12 (2026-08-07) — baris lama DIBIARKAN di DB
  // (harmless, redirect ke /customer-revenue sekarang statis di App.tsx),
  // 5 baris baru ditambahkan idempotent.
  { page_key: 'customer-revenue', ready: true },
  { page_key: 'customer-gross-profit', ready: true },
  { page_key: 'high-margin-penetration', ready: true },
  { page_key: 'repeat-order', ready: true },
  { page_key: 'customer-expansion', ready: true },
  // 'dormant-customer' (bundel M8+M9+M10) dipecah jadi 3 halaman task025 §7a
  // (2026-08-07) — baris lama DIBIARKAN di DB (harmless, sudah tidak dipakai
  // route manapun, redirect ke /dormant-rate sekarang statis di App.tsx,
  // tidak bergantung page_settings), 3 baris baru ditambahkan idempotent.
  { page_key: 'dormant-rate', ready: true },
  { page_key: 'dormant-value', ready: true },
  { page_key: 'reactivation-rate', ready: true },
  { page_key: 'cross-selling', ready: true },
  // Growth/Retention/Value (task029, 2026-08-19) — 1 menu, 1 halaman baru
  // per grup KPI (lihat frontend routeConstants.tsx + config/menu.tsx).
  // Route di App.tsx cuma ter-render kalau page_key-nya ADA di tabel ini
  // (lihat pageSettings?.map di App.tsx) — baris ini WAJIB supaya
  // /growth /retention /value bisa diakses, bukan permission RBAC.
  { page_key: 'growth', ready: true },
  { page_key: 'retention', ready: true },
  { page_key: 'value', ready: true },
  // Laporan > Growth/Retention/Revenue (task029.md §30.19, 2026-08-22) —
  // tabel breakdown dipindah dari inline chart Growth ke halaman terpisah
  // (koreksi user: "terlalu kotor jika chart digabung dengan tabel").
  // CATATAN: ini BUKAN pengaktifan kembali page_key lama `report-cross-
  // selling`/`report-avg-category-per-customer`/dst (task026 Fase 3,
  // 2026-08-09, baris masih ada di bawah tapi SUDAH ORPHAN — tidak ada
  // entry route-nya lagi di routeConstants.tsx sejak konsolidasi Growth/
  // Retention/Value 2026-08-19, dibiarkan harmless spt baris lama lain).
  // Struktur BARU ini dikelompokkan per FRAMEWORK (Growth/Retention/Value),
  // BUKAN per KPI individual spt sistem lama (10 halaman) — instruksi
  // eksplisit user: "buat sub menu retention, revenue, dan growth".
  { page_key: 'report-growth', ready: true },
  { page_key: 'report-retention', ready: true },
  { page_key: 'report-revenue', ready: true },
  // 'products-trend' (`/products/trend`, ProductsTrend) DIHAPUS — redundan,
  // digantikan `avg-category-per-customer` hasil pembelahan cross-selling
  // (task025 §14, 2026-08-07). Baris lama DIBIARKAN di DB (harmless, sudah
  // tidak dipakai route manapun, redirect statis di App.tsx).
  { page_key: 'avg-category-per-customer', ready: true },
  // Report (task026 Fase 3, 2026-08-09) — tabel breakdown per KPI dipisah
  // dari halaman chart (Statistik) di atas, route baru `/report/<slug>`,
  // komponen SAMA (`mode="report"`), permission REUSE (lihat routeConstants.tsx).
  { page_key: 'report-cross-selling', ready: true },
  { page_key: 'report-avg-category-per-customer', ready: true },
  { page_key: 'report-dormant-rate', ready: true },
  { page_key: 'report-dormant-value', ready: true },
  { page_key: 'report-reactivation-rate', ready: true },
  { page_key: 'report-customer-revenue', ready: true },
  { page_key: 'report-customer-gross-profit', ready: true },
  { page_key: 'report-high-margin-penetration', ready: true },
  { page_key: 'report-repeat-order', ready: true },
  { page_key: 'report-customer-expansion', ready: true },
  { page_key: 'products', ready: true },
  { page_key: 'products-high-margin', ready: true },
  { page_key: 'transactions', ready: true },
  { page_key: 'projects', ready: false },
  { page_key: 'import', ready: true },
  { page_key: 'users', ready: true },
  { page_key: 'rbac', ready: true },
  { page_key: 'ab-testing', ready: true },
  { page_key: 'audit-log', ready: true },
  { page_key: 'activity-log', ready: true },
  { page_key: 'login-log', ready: true },
  { page_key: 'companies', ready: true },
  { page_key: 'settings-divisions', ready: true },
  { page_key: 'settings-division-management', ready: true },
  { page_key: 'settings-customer-intercompany', ready: true },
  { page_key: 'settings-high-margin', ready: true },
  { page_key: 'settings-pareto-customers', ready: true },
  { page_key: 'analisis', ready: true },
  { page_key: 'analisis-retention', ready: true },
  { page_key: 'notifications', ready: true },
  { page_key: 'settings-classification', ready: true },
  { page_key: 'settings-threshold', ready: true },
  { page_key: 'settings-app', ready: true },
  { page_key: 'config-integration', ready: true },
  { page_key: 'config-features', ready: true },
]

async function seedCompanies() {
  console.log('Seeding companies...')
  for (const c of defaultCompanies) {
    const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.code, c.code)).limit(1)
    if (existing) { console.log(`  skip  ${c.code}`); continue }
    await db.insert(companies).values({ code: c.code, name: c.name })
    console.log(`  ok    ${c.code}`)
  }
}

/**
 * Seed 7 division default (task012 v2) untuk tiap company — dipanggil di sini
 * (bukan cuma lewat hook createCompany) karena seedCompanies() di atas insert
 * company langsung ke DB (bypass companies.service.ts), dan seedUserAssignments()
 * di bawah BUTUH divisions sudah terisi utk assign superadmin/admin full access.
 *
 * HANYA company yang BENAR-BENAR belum punya division sama sekali (company baru,
 * belum pernah di-setup) yang di-seed template 7-division penuh. Company yang
 * sudah punya divisi apa pun (termasuk cuma sebagian, hasil kurasi manual sesuai
 * kebutuhan bisnis asli — mis. KNT cuma pakai 4 dari 7) DILEWATI TOTAL, bukan
 * ditambal per-key yang hilang (2026-08-27, koreksi bug: `seedDefaultDivisions`
 * pakai `onConflictDoNothing` per KEY, jadi re-run seeder ini diam-diam menambah
 * divisi generik/tidak terpakai ke company yang sudah dikurasi — ditemukan
 * lewat audit data production, lihat docs-v2/task/task029.md). `onConflictDoNothing`
 * di seedDefaultDivisions() sendiri TETAP dipertahankan (bukan dihapus) — masih
 * dipakai apa adanya oleh hook createCompany (companies.service.ts) utk company
 * BARU yang jelas belum punya divisi sama sekali.
 */
async function seedDivisionsDefault() {
  console.log('Seeding divisions...')
  const allCompanies = await db.select({ id: companies.id, code: companies.code }).from(companies)
  let seeded = 0
  let skipped = 0
  for (const c of allCompanies) {
    const [existing] = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, c.id)).limit(1)
    if (existing) { console.log(`  skip  ${c.code} (sudah punya divisi, tidak ditambal)`); skipped++; continue }

    if (c.code === 'PT MKO') {
      // MKO_DIVISIONS_TEMPLATE literal PERSIS kebutuhan bisnis MKO (7 divisi) —
      // BUKAN template generik company lain, lihat komentar di divisions.repository.ts.
      // Mirror pola defaultBranches di bawah (literal per-company, bukan lintas-company).
      for (const d of MKO_DIVISIONS_TEMPLATE) {
        await db.insert(divisions).values({
          company_id: c.id,
          branch_id: null,
          key: d.key,
          label: d.label,
          dormant_category: d.dormant_category,
          is_protected: 'is_protected' in d ? d.is_protected : false,
        }).onConflictDoNothing()
      }
      console.log(`  ok    ${c.code} (7 divisi MKO)`)
    } else {
      // Company lain (KNT, SKI, dan company baru apa pun ke depan) cuma dapat
      // 1 divisi minimal "Lainnya" — struktur divisi riilnya beda-beda per company,
      // dibuat manual lewat Settings > Division Management, bukan ditebak seeder.
      await seedDefaultDivisions(c.id)
      console.log(`  ok    ${c.code} (1 divisi minimal: Lainnya)`)
    }
    seeded++
  }
  console.log(`  ok    default divisions -> ${seeded} company baru, ${skipped} company dilewati (sudah punya divisi)`)
}

async function seedBranches() {
  console.log('Seeding branches...')
  const allCompanies = await db.select().from(companies)
  const companyMap = new Map(allCompanies.map(c => [c.code, c.id]))

  for (const b of defaultBranches) {
    const companyId = companyMap.get(b.company_code)
    if (!companyId) { console.log(`  skip  company ${b.company_code} not found`); continue }

    const [existing] = await db
      .select({ id: company_branches.id })
      .from(company_branches)
      .where(and(
        eq(company_branches.company_id, companyId),
        eq(company_branches.code, b.code),
      ))
      .limit(1)
    if (existing) { console.log(`  skip  ${b.company_code}/${b.code}`); continue }

    await db.insert(company_branches).values({
      company_id: companyId,
      name: b.name,
      code: b.code,
      is_active: b.is_active,
    })
    console.log(`  ok    ${b.company_code}/${b.code} (${b.name})`)
  }
}

async function seedRoles() {
  console.log('Seeding roles...')
  for (const r of defaultRoles) {
    const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, r.name)).limit(1)
    if (existing) { console.log(`  skip  ${r.name}`); continue }
    await db.insert(roles).values({ name: r.name, description: r.description, is_system: r.is_system })
    console.log(`  ok    ${r.name}`)
  }
}

async function seedUsers() {
  console.log('Seeding users...')
  for (const u of defaultUsers) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1)
    if (existing) { console.log(`  skip  ${u.email}`); continue }
    const hashed = await hashPassword(u.password)
    await db.insert(users).values({ name: u.name, email: u.email, password: hashed, is_active: true, last_login_at: null })
    console.log(`  ok    ${u.email}`)
  }
}

async function cleanupOldPermissions() {
  console.log('Removing old permission keys...')
  const existing = await db
    .select({ name: permissions.name })
    .from(permissions)
    .where(inArray(permissions.name, OLD_PERMISSION_NAMES))
  if (existing.length === 0) { console.log('  nothing to remove'); return }
  await db.delete(permissions).where(inArray(permissions.name, OLD_PERMISSION_NAMES))
  console.log(`  removed ${existing.length} old permission(s)`)
}

async function seedPermissionsList() {
  console.log('Seeding permissions...')
  for (const p of defaultPermissions) {
    const [existing] = await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.name, p.name)).limit(1)
    if (existing) { console.log(`  skip  ${p.name}`); continue }
    await db.insert(permissions).values(p)
    console.log(`  ok    ${p.name}`)
  }
}

async function seedRolePermissions() {
  console.log('Seeding role-permissions...')
  try {
    const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'superadmin')).limit(1)
    if (!role) { console.log('  skip  superadmin not found'); return }
    const allPerms = await db.select({ id: permissions.id }).from(permissions)
    for (const p of allPerms) {
      const [ex] = await db.select({ roleId: rolePermissions.role_id }).from(rolePermissions).where(and(eq(rolePermissions.role_id, role.id), eq(rolePermissions.permission_id, p.id))).limit(1)
      if (!ex) await db.insert(rolePermissions).values({ role_id: role.id, permission_id: p.id })
    }
    console.log(`  ok    ${allPerms.length} perms -> superadmin`)
  } catch (err) { console.error('  error:', err) }

  await seedRoleDefaultPermissions('admin', ADMIN_PERMISSION_NAMES)
  await seedRoleDefaultPermissions('user', USER_PERMISSION_NAMES)
}

// Rename permission (task025 §12, 2026-08-07): KPI3-7 dipecah dari
// expansion:*/analisis:*/analisis.retention:* jadi 5 permission spesifik
// per-KPI (lihat defaultPermissions & ADMIN/USER_PERMISSION_NAMES di atas).
// Role CUSTOM (bukan admin/user/superadmin, dibuat manual lewat RBAC UI)
// TIDAK tersentuh oleh ADMIN/USER_PERMISSION_NAMES — kalau ada role custom
// yang py2 di-grant permission lama ini secara manual, migrasi generik di
// bawah memastikan mereka OTOMATIS dapat permission baru yang setara,
// SEBELUM permission lama ini benar-benar dilepas dari pemakaian di route.
// Tidak pernah mencabut apa pun, cuma menambah — aman dijalankan berkali-kali.
const PERMISSION_RENAME_MAP: Record<string, string[]> = {
  'expansion:menu':   ['customer.revenue:menu', 'customer.gross.profit:menu', 'high.margin.penetration:menu', 'repeat.order:menu', 'customer.expansion:menu'],
  'expansion:view':   ['customer.revenue:view', 'customer.gross.profit:view', 'high.margin.penetration:view', 'repeat.order:view', 'customer.expansion:view'],
  'expansion:export': ['customer.revenue:export', 'customer.gross.profit:export', 'high.margin.penetration:export', 'repeat.order:export', 'customer.expansion:export'],
  'analisis:menu':    ['customer.revenue:menu'],
  'analisis:view':    ['customer.revenue:view'],
  'analisis.retention:menu': ['repeat.order:menu'],
  'analisis.retention:view': ['repeat.order:view'],
  // CrossSelling dipecah jadi 2 halaman (task025 §14, 2026-08-07) — KPI2
  // (`/avg-category-per-customer`) reuse `cross.selling:*` (endpoint backend
  // TETAP 1), MENGGANTIKAN `product.trend:*` punya `ProductsTrend` yang
  // dihapus. Role custom yang sebelumnya cuma di-grant `product.trend:*`
  // (tanpa `cross.selling:*`) di-backfill di sini supaya tidak kehilangan
  // akses ke KPI2.
  'product.trend:menu':   ['cross.selling:menu'],
  'product.trend:view':   ['cross.selling:view'],
  'product.trend:export': ['cross.selling:export'],
}

async function migrateRenamedPermissions() {
  console.log('Migrasi permission lama -> baru (backfill semua role, termasuk custom)...')
  const allPermRows = await db.select({ id: permissions.id, name: permissions.name }).from(permissions)
  const idByName = new Map(allPermRows.map((p) => [p.name, p.id]))

  let totalGranted = 0
  for (const [oldName, newNames] of Object.entries(PERMISSION_RENAME_MAP)) {
    const oldId = idByName.get(oldName)
    if (!oldId) continue // permission lama sudah tidak ada (misal sudah di-cleanup) — skip

    // Semua role yang PUNYA permission lama ini
    const rolesWithOld = await db
      .select({ roleId: rolePermissions.role_id })
      .from(rolePermissions)
      .where(eq(rolePermissions.permission_id, oldId))

    for (const { roleId } of rolesWithOld) {
      for (const newName of newNames) {
        const newId = idByName.get(newName)
        if (!newId) continue
        const [ex] = await db
          .select({ roleId: rolePermissions.role_id })
          .from(rolePermissions)
          .where(and(eq(rolePermissions.role_id, roleId), eq(rolePermissions.permission_id, newId)))
          .limit(1)
        if (!ex) {
          await db.insert(rolePermissions).values({ role_id: roleId, permission_id: newId })
          totalGranted++
        }
      }
    }
  }
  console.log(`  ok    ${totalGranted} grant baru dari migrasi rename`)
}

/**
 * Assign baseline permission (by name) ke role tertentu — cuma nambah yang belum
 * ada (idempotent, sama seperti pola superadmin di atas), TIDAK PERNAH mencabut
 * permission yang sudah di-assign manual lewat RBAC UI. Aman dijalankan ulang
 * kapan saja tanpa menimpa kustomisasi yang sudah dibuat admin.
 */
async function seedRoleDefaultPermissions(roleName: string, permissionNames: string[]) {
  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, roleName)).limit(1)
  if (!role) { console.log(`  skip  ${roleName} not found`); return }

  const perms = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(inArray(permissions.name, permissionNames))

  let added = 0
  for (const p of perms) {
    const [ex] = await db
      .select({ roleId: rolePermissions.role_id })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.role_id, role.id), eq(rolePermissions.permission_id, p.id)))
      .limit(1)
    if (!ex) { await db.insert(rolePermissions).values({ role_id: role.id, permission_id: p.id }); added++ }
  }
  console.log(`  ok    ${added} perms baru -> ${roleName} (total target: ${perms.length}/${permissionNames.length} ditemukan)`)
}

async function seedUserAssignments() {
  console.log('Seeding user-roles & user-companies/branches/divisions...')
  try {
    const allRoles = await db.select({ id: roles.id, name: roles.name }).from(roles)
    const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]))
    const cs = await db.select({ id: companies.id }).from(companies)
    const allBranches = await db.select({ id: company_branches.id, company_id: company_branches.company_id }).from(company_branches)
    // Division sekarang FK per company + opsional per branch (task012 v2) — assign
    // superadmin/admin ke division MILIK company itu (company-wide, branch_id NULL)
    // + division spesifik branch itu sendiri kalau ada, bukan 7 value tetap lagi.
    const allDivisions = await db.select({ id: divisions.id, company_id: divisions.company_id, branch_id: divisions.branch_id }).from(divisions).where(eq(divisions.is_active, true))
    const companyWideDivisionIdsByCompany = new Map<number, number[]>()
    const branchSpecificDivisionIdsByBranch = new Map<number, number[]>()
    for (const d of allDivisions) {
      if (d.branch_id == null) {
        if (!companyWideDivisionIdsByCompany.has(d.company_id)) companyWideDivisionIdsByCompany.set(d.company_id, [])
        companyWideDivisionIdsByCompany.get(d.company_id)!.push(d.id)
      } else {
        if (!branchSpecificDivisionIdsByBranch.has(d.branch_id)) branchSpecificDivisionIdsByBranch.set(d.branch_id, [])
        branchSpecificDivisionIdsByBranch.get(d.branch_id)!.push(d.id)
      }
    }

    // superadmin & admin test users: auto-assign semua company + semua branch + semua division
    // (admin TIDAK bypass kode — lihat docs-v2/task/task001.md §2 — jadi tetap butuh row
    // eksplisit di user_companies/user_branches/user_divisions, bukan cuma role check)
    // user test user: tidak di-assign apa pun dari seed — assign manual via UI
    const assignments: { email: string; role: string; allCompanies: boolean }[] = [
      { email: 'admin@mail.com',     role: 'superadmin', allCompanies: true },
      { email: 'executif@mail.com',  role: 'admin',      allCompanies: true },
      { email: 'user@mail.com',      role: 'user',       allCompanies: false },
    ]

    for (const { email, role, allCompanies } of assignments) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
      if (!u) { console.log(`  skip  ${email} not found`); continue }

      const roleId = roleMap[role]
      if (roleId) {
        const [ex] = await db.select({ userId: userRoles.user_id }).from(userRoles).where(eq(userRoles.user_id, u.id)).limit(1)
        if (!ex) { await db.insert(userRoles).values({ user_id: u.id, role_id: roleId }); console.log(`  ok    ${role} -> ${email}`) }
        else { console.log(`  skip  ${role} -> ${email}`) }
      }

      if (allCompanies) {
        for (const c of cs) {
          const [ex] = await db.select({ userId: userCompanies.user_id }).from(userCompanies)
            .where(and(eq(userCompanies.user_id, u.id), eq(userCompanies.company_id, c.id))).limit(1)
          if (!ex) await db.insert(userCompanies).values({ user_id: u.id, company_id: c.id })
        }
        console.log(`  ok    ${cs.length} companies -> ${email}`)

        const branchesInScope = allBranches.filter((b) => cs.some((c) => c.id === b.company_id))
        for (const b of branchesInScope) {
          const [ex] = await db.select({ userId: userBranches.user_id }).from(userBranches)
            .where(and(eq(userBranches.user_id, u.id), eq(userBranches.branch_id, b.id))).limit(1)
          if (!ex) await db.insert(userBranches).values({ user_id: u.id, company_id: b.company_id, branch_id: b.id })
        }
        console.log(`  ok    ${branchesInScope.length} branches -> ${email}`)

        let divisionAssignCount = 0
        for (const b of branchesInScope) {
          const divisionIds = [
            ...(companyWideDivisionIdsByCompany.get(b.company_id) ?? []),
            ...(branchSpecificDivisionIdsByBranch.get(b.id) ?? []),
          ]
          for (const divisionId of divisionIds) {
            const [ex] = await db.select({ userId: userDivisions.user_id }).from(userDivisions)
              .where(and(eq(userDivisions.user_id, u.id), eq(userDivisions.branch_id, b.id), eq(userDivisions.division_id, divisionId))).limit(1)
            if (!ex) await db.insert(userDivisions).values({ user_id: u.id, branch_id: b.id, division_id: divisionId })
            divisionAssignCount++
          }
        }
        console.log(`  ok    ${divisionAssignCount} branch-divisions -> ${email}`)
      } else {
        console.log(`  skip  companies/branches/divisions -> ${email} (assign manual via UI)`)
      }
    }
  } catch (err) { console.error('  error:', err) }
}

async function seedBusinessConfigs() {
  console.log('Seeding business configs...')
  for (const cfg of defaultBusinessConfigs) {
    const [existing] = await db.select({ id: businessConfigs.id }).from(businessConfigs).where(eq(businessConfigs.key, cfg.key)).limit(1)
    if (existing) { console.log(`  skip  ${cfg.key}`); continue }
    await db.insert(businessConfigs).values(cfg)
    console.log(`  ok    ${cfg.key} = ${cfg.value}`)
  }
}

async function seedPageSettings() {
  console.log('Seeding page settings...')
  for (const page of defaultPageSettings) {
    const [existing] = await db.select({ id: pageSettings.id }).from(pageSettings).where(eq(pageSettings.page_key, page.page_key)).limit(1)
    if (existing) { console.log(`  skip  ${page.page_key}`); continue }
    await db.insert(pageSettings).values({ page_key: page.page_key, ready: page.ready })
    console.log(`  ok    ${page.page_key} (ready: ${page.ready})`)
  }
}

async function seed() {
  try {
    await seedCompanies()
    await seedDivisionsDefault()
    await seedBranches()
    await seedRoles()
    await seedUsers()
    await cleanupOldPermissions()
    await seedPermissionsList()
    await seedRolePermissions()
    await migrateRenamedPermissions()
    await seedUserAssignments()
    await seedBusinessConfigs()
    await seedPageSettings()
    console.log('All seeds completed.')
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})