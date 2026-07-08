import { db } from '@/config/db'
import { company_branches, users, pageSettings, companies, roles, permissions, userRoles, userCompanies, userBranches, userDivisions, rolePermissions, businessConfigs } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { eq, and, inArray } from 'drizzle-orm'

// Division: 6 value bisnis existing + 'other' ("Lainnya") — lihat docs-v2/task/task001.md §4.5
const ALL_DIVISION_VALUES = ['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support', 'other']

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
  { company_code: 'PT KNT', name: 'Surabaya', code: 'SBY', is_active: true },
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

  // ── Audit Log ──────────────────────────────────────────────────────────
  { name: 'audit.log:menu',   description: 'Menu Audit Log',   category: 'Audit Log' },
  { name: 'audit.log:view',   description: 'View Audit Log',   category: 'Audit Log' },
  { name: 'audit.log:export', description: 'Export Audit Log', category: 'Audit Log' },
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
  'settings.product:menu', 'settings.product:view', 'settings.product:update',
  'settings.threshold:menu', 'settings.threshold:view', 'settings.threshold:update',
  'audit.log:menu', 'audit.log:view',
]

// Baseline permission untuk role 'user' — view + export saja di menu bisnis inti,
// tidak ada create/update/delete apa pun, dan TIDAK ADA satu pun menu Administration
// (Settings/Configuration/Access Control/Audit Log semuanya di luar jangkauan).
const USER_PERMISSION_NAMES = [
  'dashboard:menu', 'dashboard:view',
  'customer:menu', 'customer:view',
  'expansion:menu', 'expansion:view', 'expansion:export',
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
]

const defaultPageSettings = [
  { page_key: 'dashboard', ready: true },
  { page_key: 'customers', ready: true },
  { page_key: 'customers-expansion', ready: true },
  { page_key: 'dormant-customer', ready: true },
  { page_key: 'cross-selling', ready: true },
  { page_key: 'products', ready: true },
  { page_key: 'products-high-margin', ready: true },
  { page_key: 'products-trend', ready: true },
  { page_key: 'transactions', ready: true },
  { page_key: 'projects', ready: false },
  { page_key: 'import', ready: true },
  { page_key: 'users', ready: true },
  { page_key: 'rbac', ready: true },
  { page_key: 'audit-log', ready: true },
  { page_key: 'companies', ready: true },
  { page_key: 'settings-divisions', ready: true },
  { page_key: 'settings-high-margin', ready: true },
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

        for (const b of branchesInScope) {
          for (const division of ALL_DIVISION_VALUES) {
            const [ex] = await db.select({ userId: userDivisions.user_id }).from(userDivisions)
              .where(and(eq(userDivisions.user_id, u.id), eq(userDivisions.branch_id, b.id), eq(userDivisions.division, division))).limit(1)
            if (!ex) await db.insert(userDivisions).values({ user_id: u.id, branch_id: b.id, division })
          }
        }
        console.log(`  ok    ${branchesInScope.length * ALL_DIVISION_VALUES.length} branch-divisions -> ${email}`)
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
    await seedBranches()
    await seedRoles()
    await seedUsers()
    await cleanupOldPermissions()
    await seedPermissionsList()
    await seedRolePermissions()
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