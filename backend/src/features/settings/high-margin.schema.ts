import { z } from 'zod'

// task017 — division_ids WAJIB minimal 1 (tidak ada state "company-wide, tidak
// spesifik divisi manapun"), divalidasi bukan Intercompany di service layer
// (butuh lookup DB, tidak bisa murni di schema) — lihat assertNoIntercompanyDivision.
export const createHighMarginSchema = z.object({
  company_id: z.number().int().positive(),
  product_id: z.number().int().positive().optional(),
  product_category_id: z.number().int().positive().optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  effective_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  note: z.string().max(500).optional(),
  division_ids: z.array(z.number().int().positive()).min(1, 'Pilih minimal 1 divisi'),
}).refine(
  (d) => d.product_id !== undefined || d.product_category_id !== undefined,
  { message: 'Harus mengisi product_id atau product_category_id' },
).refine(
  (d) => !d.effective_until || d.effective_until >= d.effective_from,
  { message: 'effective_until tidak boleh sebelum effective_from' },
)

export const updateHighMarginSchema = z.object({
  effective_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').nullable(),
  note: z.string().max(500).optional(),
  division_ids: z.array(z.number().int().positive()).min(1, 'Pilih minimal 1 divisi'),
})

export const listHighMarginQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM').optional(),
  // z.coerce.boolean() salah untuk query string: Boolean("false") === true
  active_only: z.string().optional().default('false').transform(v => v === 'true'),
})

export const highMarginIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateHighMarginDto = z.infer<typeof createHighMarginSchema>
export type UpdateHighMarginDto = z.infer<typeof updateHighMarginSchema>
export type ListHighMarginQuery = z.infer<typeof listHighMarginQuerySchema>

// ─── Bulk Import (task036, 2026-08-31) ─────────────────────────────────────
// Alur 2 tahap (instruksi user): preview (parse+validasi, TANPA tulis DB)
// lalu commit (baru insert, setelah user review status tiap baris di
// frontend) — BEDA dari import lain (divisi/klasifikasi) yang commit
// langsung 1 langkah, lihat task036.md §"Alur UI".

export const highMarginImportTemplateQuerySchema = z.object({
  company_id: z.coerce.number().int().positive(),
})

// commit menerima baris HASIL preview (bukan file mentah lagi) — frontend
// yang re-submit row yang mau disimpan, backend WAJIB validasi ulang semua
// (jangan percaya begitu saja payload client, lihat task036.md §Backend).
const highMarginImportCommitRowSchema = z.object({
  type: z.enum(['product', 'category']),
  target_id: z.number().int().positive(),
  division_ids: z.array(z.number().int().positive()).min(1, 'Pilih minimal 1 divisi'),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  effective_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  note: z.string().max(500).optional(),
  // supersede_id — TERISI kalau baris ini konflik dan user pilih "Pakai yang
  // Baru": mapping lama (id ini) otomatis dinonaktifkan (effective_until =
  // sehari sebelum effective_from baris baru) dalam TRANSAKSI YANG SAMA
  // dengan insert baris baru. Kosong = insert biasa (baris Sukses, atau
  // baris Konflik yang user pilih "Pertahankan yang Lama" TIDAK PERNAH
  // dikirim sama sekali ke commit — di-skip di frontend sebelum submit).
  supersede_id: z.number().int().positive().optional(),
})

export const highMarginImportCommitSchema = z.object({
  company_id: z.number().int().positive(),
  rows: z.array(highMarginImportCommitRowSchema).min(1, 'Tidak ada baris untuk disimpan'),
})

export type HighMarginImportTemplateQuery = z.infer<typeof highMarginImportTemplateQuerySchema>
export type HighMarginImportCommitDto = z.infer<typeof highMarginImportCommitSchema>
export type HighMarginImportCommitRow = z.infer<typeof highMarginImportCommitRowSchema>
