/**
 * db/schema/schema-auth.ts
 *
 * Tabel-tabel domain Auth & RBAC: users, roles, permissions, dan junction table
 * relasinya (role_permissions, user_roles, user_companies), plus audit_logs.
 *
 * Konvensi:
 * - Soft delete via deleted_at (nullable timestamp) — cuma di users.
 * - Password di-hash dengan bcryptjs cost >= 12.
 * - is_active = false berarti user tidak bisa login (tapi data tetap ada).
 * - is_system (roles) = role bawaan sistem (superadmin, admin, dll) — tidak bisa dihapus/rename.
 * - audit_logs bersifat immutable (tidak ada updated_at/deleted_at).
 */

import {
  pgTable,
  serial,
  varchar,
  boolean,
  text,
  integer,
  jsonb,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { companies } from './schema-company'

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  last_login_at: timestamp('last_login_at', { withTimezone: true }),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ─── roles ────────────────────────────────────────────────────────────────────

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  // Unique role identifier, e.g. 'superadmin', 'admin', 'manager', 'sales', 'executive'
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  // System roles cannot be deleted or renamed
  is_system: boolean('is_system').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

// ─── permissions ──────────────────────────────────────────────────────────────

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  // Unique permission identifier, e.g. 'user.create', 'user.read', 'invoice.import'
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  // Permission category for grouping, e.g. 'user', 'invoice', 'role', 'company'
  category: varchar('category', { length: 50 }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert

// ─── role_permissions (junction: roles <-> permissions) ───────────────────────

export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permission_id: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.role_id, table.permission_id] }),
  }),
)

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert

// ─── user_roles (junction: users <-> roles) ───────────────────────────────────

export const userRoles = pgTable(
  'user_roles',
  {
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role_id: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.role_id] }),
  }),
)

export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert

// ─── user_companies (junction: users <-> companies) ───────────────────────────

export const userCompanies = pgTable(
  'user_companies',
  {
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.company_id] }),
  }),
)

export type UserCompany = typeof userCompanies.$inferSelect
export type NewUserCompany = typeof userCompanies.$inferInsert

// ─── audit_logs ───────────────────────────────────────────────────────────────

/**
 * Immutable log setiap mutasi yang terjadi di sistem — field sesuai INSERT
 * statement di utils/audit.ts: actor_id, action, entity, entity_id, company_id,
 * old_value, new_value, meta, ip_address, request_id, created_at.
 */
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  /** User yang melakukan aksi — null jika sistem */
  actor_id: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
  /** Action yang terjadi, e.g. 'user.create', 'invoice.import' */
  action: varchar('action', { length: 100 }).notNull(),
  /** Nama tabel yang terpengaruh, e.g. 'users', 'roles', 'import_logs' */
  entity: varchar('entity', { length: 100 }).notNull(),
  /** ID row yang terpengaruh — disimpan sebagai string (mendukung int dan UUID) */
  entity_id: varchar('entity_id', { length: 255 }).notNull(),
  /** Perusahaan dalam konteks mutasi — null untuk aksi global */
  company_id: integer('company_id').references(() => companies.id, { onDelete: 'set null' }),
  /** State sebelum mutasi (untuk update/delete) */
  old_value: jsonb('old_value'),
  /** State setelah mutasi (untuk create/update) */
  new_value: jsonb('new_value'),
  /** Konteks tambahan, e.g. { filename, total_rows } untuk import */
  meta: jsonb('meta'),
  /** IP address actor */
  ip_address: varchar('ip_address', { length: 45 }),
  /** Request ID untuk tracing (dari header x-request-id) */
  request_id: varchar('request_id', { length: 100 }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
