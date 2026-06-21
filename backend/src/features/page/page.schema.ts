import { z } from 'zod'

// ─── Response Schemas ──────────────────────────────────────────────────────────

export const pageSettingResponseSchema = z.object({
  id: z.number(),
  pageKey: z.string(),
  ready: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const updatePageSettingSchema = z.object({
  ready: z.boolean(),
})

export const pageKeyParamSchema = z.object({
  pageKey: z.string().min(1).max(100),
})

// ─── Type Exports ──────────────────────────────────────────────────────────────

export type PageSettingResponse = z.infer<typeof pageSettingResponseSchema>
export type UpdatePageSettingDto = z.infer<typeof updatePageSettingSchema>