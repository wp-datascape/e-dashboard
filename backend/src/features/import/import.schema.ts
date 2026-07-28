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
