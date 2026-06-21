import { db } from '@/config/db'
import { users, pageSettings, companies, roles, permissions, userRoles, userCompanies, rolePermissions, businessConfigs } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { eq, and } from 'drizzle-orm'

const defaultCompanies = [
  { code: 'PT MKO', name: 'PT Mesin Kasri Online' },
  { code: 'PT KNT', name: 'PT Kode Niaga Tama' },
  { code: 'PT SKI', name: 'PT Solusi Kartu Indonesia' },
]

const defaultRoles = [
  { name: 'superadmin', description: 'Full access to all features', isSystem: true },
  { name: 'admin', description: 'Administrative access', isSystem: false },
  { name: 'user', description: 'User access', isSystem: false },
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
  { pageKey: 'dashboard', ready: true },
  { pageKey: 'customers', ready: true },
  { pageKey: 'customers-expansion', ready: true },
  { pageKey: 'dormant-customer', ready: true },
  { pageKey: 'cross-selling', ready: true },
  { pageKey: 'products', ready: true },
  { pageKey: 'products-high-margin', ready: true },
  { pageKey: 'products-trend', ready: true },
  { pageKey: 'transactions', ready: true },
  { pageKey: 'projects', ready: false },
  { pageKey: 'import', ready: true },
  { pageKey: 'users', ready: true },
  { pageKey: 'rbac', ready: true },
  { pageKey: 'config', ready: true },
  { pageKey: 'audit-log', ready: true },
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

async function seedRoles() {
  console.log('Seeding roles...')
  for (const r of defaultRoles) {
    const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, r.name)).limit(1)
    if (existing) { console.log(`  skip  ${r.name}`); continue }
    await db.insert(roles).values({ name: r.name, description: r.description, isSystem: r.isSystem })
    console.log(`  ok    ${r.name}`)
  }
}

async function seedUsers() {
  console.log('Seeding users...')
  for (const u of defaultUsers) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1)
    if (existing) { console.log(`  skip  ${u.email}`); continue }
    const hashed = await hashPassword(u.password)
    await db.insert(users).values({ name: u.name, email: u.email, password: hashed, isActive: true, lastLoginAt: null })
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
      const [ex] = await db.select({ roleId: rolePermissions.roleId }).from(rolePermissions).where(and(eq(rolePermissions.roleId, role.id), eq(rolePermissions.permissionId, p.id))).limit(1)
      if (!ex) await db.insert(rolePermissions).values({ roleId: role.id, permissionId: p.id })
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
      const [ex] = await db.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.userId, u.id)).limit(1)
      if (!ex) { await db.insert(userRoles).values({ userId: u.id, roleId: role.id }); console.log('  ok    superadmin -> admin@mail.com') }
    }

    const cs = await db.select({ id: companies.id }).from(companies)
    for (const c of cs) {
      const [ex] = await db.select({ userId: userCompanies.userId }).from(userCompanies).where(eq(userCompanies.userId, u.id)).limit(1)
      if (!ex) await db.insert(userCompanies).values({ userId: u.id, companyId: c.id })
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
    const [existing] = await db.select({ id: pageSettings.id }).from(pageSettings).where(eq(pageSettings.pageKey, page.pageKey)).limit(1)
    if (existing) { console.log(`  skip  ${page.pageKey}`); continue }
    await db.insert(pageSettings).values({ pageKey: page.pageKey, ready: page.ready })
    console.log(`  ok    ${page.pageKey} (ready: ${page.ready})`)
  }
}

async function seed() {
  try {
    await seedCompanies()
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