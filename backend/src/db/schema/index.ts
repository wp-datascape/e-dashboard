/**
 * db/schema/index.ts
 *
 * Re-export semua Drizzle table definitions.
 * Tambahkan export di sini setiap kali membuat schema baru.
 *
 * Organisasi file per domain (2026-07-06, sebelumnya 1 file per tabel):
 * - schema-auth.ts        — users, roles, permissions, role_permissions,
 *                           user_roles, user_companies, audit_logs,
 *                           activity_logs, login_logs
 * - schema-company.ts     — companies, company_branches, business_configs,
 *                           accurate_credentials, user_branches, user_divisions
 * - schema-product.ts     — product_categories, products, high_margin_products,
 *                           item_classification_rules, channel_divisions
 * - schema-transaction.ts — customers, invoices, invoice_items, import_logs,
 *                           import_log_errors, pareto_customers,
 *                           pareto_alert_thresholds, pareto_period_snapshots,
 *                           notifications
 * - page_settings.ts      — berdiri sendiri (tidak ada FK ke domain manapun)
 *
 * Naming convention: snake_case plural (contoh: invoices, invoice_items, companies)
 * Setiap tabel wajib punya: id, created_at, updated_at
 * Soft delete via: deleted_at (nullable)
 */

export * from './schema-auth'
export * from './schema-company'
export * from './schema-product'
export * from './schema-transaction'
export * from './page_settings'
// export * from './metric_cache'
