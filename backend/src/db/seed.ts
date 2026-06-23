import { db } from '@/config/db'
import { company_branches, users, pageSettings, companies, roles, permissions, userRoles, userCompanies, rolePermissions, businessConfigs } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { eq, and } from 'drizzle-orm'

const defaultCompanies = [
  { code: 'PT MKO', name: 'PT Mesin Kasri Online' },
  { code: 'PT KNT', name: 'PT Kode Niaga Tama' },
  { code: 'PT SKI', name: 'PT Solusi Kartu Indonesia' },
]

const defaultBranches = [
  // PT MKO — 1 branch (Pusat)
  { company_code: 'PT MKO', name: 'Pusat', code: 'PUSAT', is_active: true },
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

const defaultPermissions = [
  // Dashboard & Metrics
  { name: 'metrics:menu', description: 'Menu Dashboard', category: 'Dashboard & Metrics' },
  { name: 'metrics:view', description: 'View Dashboard & Metrics', category: 'Dashboard & Metrics' },

  // Customers
  { name: 'customers:menu', description: 'Menu Customer', category: 'Customers' },
  { name: 'customers:view', description: 'View Customer', category: 'Customers' },
  { name: 'customers:input', description: 'Input Customer Baru', category: 'Customers' },
  { name: 'customers:update', description: 'Update Customer', category: 'Customers' },
  { name: 'customers:delete', description: 'Delete Customer', category: 'Customers' },

  // Products
  { name: 'products:menu', description: 'Menu Product', category: 'Products' },
  { name: 'products:view', description: 'View Product', category: 'Products' },
  { name: 'products:input', description: 'Input Product Baru', category: 'Products' },
  { name: 'products:update', description: 'Update Product', category: 'Products' },
  { name: 'products:delete', description: 'Delete Product', category: 'Products' },

  // Transactions
  { name: 'transactions:menu', description: 'Menu Transaksi', category: 'Transactions' },
  { name: 'transactions:view', description: 'View Transaksi', category: 'Transactions' },
  { name: 'transactions:input', description: 'Input Transaksi Baru', category: 'Transactions' },
  { name: 'transactions:update', description: 'Update Transaksi', category: 'Transactions' },
  { name: 'transactions:delete', description: 'Delete Transaksi', category: 'Transactions' },

  // Import
  { name: 'import:menu', description: 'Menu Import', category: 'Import' },
  { name: 'import:view', description: 'View Log Import', category: 'Import' },
  { name: 'import:input', description: 'Import Faktur', category: 'Import' },

  // Users
  { name: 'users:menu', description: 'Menu Users', category: 'Users' },
  { name: 'users:view', description: 'View Users', category: 'Users' },
  { name: 'users:input', description: 'Input User Baru', category: 'Users' },
  { name: 'users:update', description: 'Update User', category: 'Users' },
  { name: 'users:delete', description: 'Delete User', category: 'Users' },

  // RBAC (Roles)
  { name: 'rbac:menu', description: 'Menu Roles', category: 'Roles' },
  { name: 'rbac:view', description: 'View Roles', category: 'Roles' },
  { name: 'rbac:input', description: 'Input Role Baru', category: 'Roles' },
  { name: 'rbac:update', description: 'Update Role', category: 'Roles' },
  { name: 'rbac:delete', description: 'Delete Role', category: 'Roles' },

  // Config
  { name: 'config:menu', description: 'Menu Config', category: 'Config' },
  { name: 'config:view', description: 'View Config', category: 'Config' },
  { name: 'config:update', description: 'Update Config', category: 'Config' },

  // Audit Log
  { name: 'audit:menu', description: 'Menu Audit Log', category: 'Audit Log' },
  { name: 'audit:view', description: 'View Audit Log', category: 'Audit Log' },

  // Companies
  { name: 'companies:manage', description: 'Manage Companies & Branches', category: 'Companies' },
]

const defaultUsers = [
  { name: 'Super Admin', email: 'admin@mail.com', password: '123456' },
  { name: 'Executive Admin', email: 'executif@mail.com', password: '123456' },
  { name: 'User', email: 'user@mail.com', password: '123456' },
]

const defaultBusinessConfigs = [
  { key: 'active_window_months', value: '3', description: 'Window bulan aktif: customer dianggap aktif jika ada transaksi dalam N bulan terakhir' },
  { key: 'dormant_threshold_months.b2b_dc', value: '3', description: 'Threshold dormant untuk B2B DC (bulan)' },
  { key: 'dormant_threshold_months.b2b_project', value: '12', description: 'Threshold dormant untuk B2B Project (bulan) — cycle project lebih panjang' },
  { key: 'dormant_threshold_months.b2c', value: '6', description: 'Threshold dormant untuk B2C (bulan)' },
  { key: 'dormant_threshold_months.manufacturing', value: '6', description: 'Threshold dormant untuk Manufacturing (bulan)' },
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
  { page_key: 'config', ready: true },
  { page_key: 'audit-log', ready: true },
  { page_key: 'companies', ready: true },
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
}

async function seedUserAssignments() {
  console.log('Seeding user-roles & user-companies...')
  try {
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'admin@mail.com')).limit(1)
    if (!u) { console.log('  skip  admin@mail.com not found'); return }

    const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'superadmin')).limit(1)
    if (role) {
      const [ex] = await db.select({ userId: userRoles.user_id }).from(userRoles).where(eq(userRoles.user_id, u.id)).limit(1)
      if (!ex) { await db.insert(userRoles).values({ user_id: u.id, role_id: role.id }); console.log('  ok    superadmin -> admin@mail.com') }
    }

    const cs = await db.select({ id: companies.id }).from(companies)
    for (const c of cs) {
      const [ex] = await db.select({ userId: userCompanies.user_id }).from(userCompanies).where(eq(userCompanies.user_id, u.id)).limit(1)
      if (!ex) await db.insert(userCompanies).values({ user_id: u.id, company_id: c.id })
    }
    console.log(`  ok    ${cs.length} companies -> admin@mail.com`)
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