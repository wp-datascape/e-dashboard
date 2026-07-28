import { z } from 'zod'

// key DIDERIVE otomatis dari label (slugify) di service layer - user cuma input
// 1 field teks (label), bukan 2 field terpisah. key TIDAK bisa diubah lewat
// update (product_categories.item_type & item_classification_rules.item_type
// referensi ke key, bukan label - ganti key diam-diam bisa bikin referensi lama
// jadi orphan). Rename tampilan cukup lewat label.
export const createItemTypeSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  label: z.string().min(1).max(50).transform((v) => v.trim()),
})

export const updateItemTypeSchema = z.object({
  label: z.string().min(1).max(50).transform((v) => v.trim()).optional(),
  is_active: z.boolean().optional(),
})

export const listItemTypesQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
})

export const itemTypeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateItemTypeDto = z.infer<typeof createItemTypeSchema>
export type UpdateItemTypeDto = z.infer<typeof updateItemTypeSchema>
export type ListItemTypesQuery = z.infer<typeof listItemTypesQuerySchema>
