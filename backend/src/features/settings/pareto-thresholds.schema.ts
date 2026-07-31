import { z } from 'zod'

// 'monthly' ditambah task016 §18 — dipakai Aturan 2 "Report/Alert Monitoring"
// bulanan (Trigger A minggu ke-2 + Trigger B awal bulan baru).
const periodTypeEnum = z.enum(['monthly', 'quarter', 'semester', 'annual'])
const metricEnum = z.enum(['revenue', 'margin'])

export const upsertParetoThresholdSchema = z.object({
  company_id: z.number().int().positive(),
  period_type: periodTypeEnum,
  metric: metricEnum,
  drop_percent: z.number().min(0).max(100),
  is_active: z.boolean().optional().default(true),
})

export const listParetoThresholdsQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
})

export const paretoThresholdIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type UpsertParetoThresholdDto = z.infer<typeof upsertParetoThresholdSchema>
export type ListParetoThresholdsQuery = z.infer<typeof listParetoThresholdsQuerySchema>
