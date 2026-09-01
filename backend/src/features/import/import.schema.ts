/**
 * features/import/import.schema.ts
 *
 * Zod schemas untuk import feature endpoints.
 */
import { z } from 'zod'

export const importFileSchema = z.object({
  company_id: z.coerce.number().positive(),
  period_month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
  // File di-handle via multipart, tidak di sini
})

export const importAccurateSchema = z.object({
  company_id: z.coerce.number().positive(),
  period_month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
})

export const importLogQuerySchema = z.object({
  company_id: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
})

export const unclassifiedItemSchema = z.object({
  item_type: z.string().min(1),
})

/**
 * Auto-priority mapping berdasarkan match_type.
 * Makin spesifik match → makin tinggi priority.
 */
export const MATCH_TYPE_PRIORITY: Record<string, number> = {
  exact_item_name: 100,
  exact_category: 90,
  keyword_item_name: 70,
  keyword_category: 50,
  price_range: 30,
}

export const classificationRuleSchema = z.object({
  company_id: z.coerce.number().nullable().optional(),
  match_type: z.enum(['keyword_item_name', 'keyword_category', 'price_range', 'exact_item_name', 'exact_category']),
  match_pattern: z.string().min(1).max(255),
  // key dinamis per company (task011), bukan 4 nilai tetap - divalidasi terhadap
  // tabel item_types di classification.service.ts (isValidItemType), bukan di
  // sini (query/schema layer tidak tau company mana yang relevan sebelum parse).
  item_type: z.string().min(1).max(30),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  is_active: z.boolean().default(true),
})

export const classificationRuleUpdateSchema = z.object({
  company_id: z.coerce.number().nullable().optional(),
  match_type: z.enum(['keyword_item_name', 'keyword_category', 'price_range', 'exact_item_name', 'exact_category']).optional(),
  match_pattern: z.string().min(1).max(255).optional(),
  item_type: z.string().min(1).max(30).optional(),
  is_active: z.boolean().optional(),
})

// ─── Review Import Faktur (task037/EDASHBOARD-588) ──────────────────────────
// Alur 2 tahap seperti High Margin (task036): preview (parse+deteksi konflik,
// TANPA tulis DB) lalu commit (baris hasil preview yang mau disimpan, dikirim
// ulang dari frontend beserta pilihan per baris konflik) — lihat
// docs-v2/task/task037.md.

const importCommitItemSchema = z.object({
  product_category: z.string().min(1),
  item_name: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit_price: z.coerce.number().optional(),
  revenue: z.coerce.number(),
  gross_profit: z.coerce.number(),
})

// action per invoice — 'skip' HANYA valid utk baris konflik yang user pilih
// "Lewati" (baris baru/new selalu 'create', tidak ada pilihan lain). Divalidasi
// ulang di service layer (jangan percaya begitu saja payload client), bukan di
// sini — schema cuma memastikan bentuknya valid.
const importCommitInvoiceSchema = z.object({
  invoice_number: z.string().min(1),
  action: z.enum(['create', 'update', 'skip']),
  invoice_date: z.string().min(1),
  customer_code: z.string().min(1),
  customer_name: z.string().min(1),
  branch_name: z.string().optional(),
  channel_name: z.string().optional(),
  items: z.array(importCommitItemSchema).min(1),
})

export const importCommitSchema = z.object({
  company_id: z.number().int().positive(),
  period_month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
  filename: z.string().min(1),
  invoices: z.array(importCommitInvoiceSchema).min(1, 'Tidak ada invoice untuk disimpan'),
})

export type ImportCommitDto = z.infer<typeof importCommitSchema>
export type ImportCommitInvoiceDto = z.infer<typeof importCommitInvoiceSchema>
