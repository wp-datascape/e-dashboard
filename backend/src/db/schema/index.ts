/**
 * db/schema/index.ts
 *
 * Re-export semua Drizzle table definitions.
 * Tambahkan export di sini setiap kali membuat schema baru.
 *
 * Naming convention: snake_case plural (contoh: invoices, invoice_items, companies)
 * Setiap tabel wajib punya: id, created_at, updated_at
 * Soft delete via: deleted_at (nullable)
 */

// Export schema — tambahkan export di sini setiap kali membuat schema baru.
// Urutan sesuai migration order (FK dependencies).
export * from './companies'
export * from './users'
export * from './roles'
export * from './permissions'
export * from './role_permissions'
export * from './user_roles'
export * from './user_companies'
export * from './page_settings'
// export * from './invoices'
// export * from './invoice_items'
// export * from './customers'
// export * from './product_categories'
export * from './audit_logs'
// export * from './import_logs'
// export * from './import_log_errors'
export * from './business_configs'
// export * from './metric_cache'
