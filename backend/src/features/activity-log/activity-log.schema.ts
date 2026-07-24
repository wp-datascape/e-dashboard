import { z } from 'zod'

export const activityLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(200).optional().default(50),
  user_id: z.coerce.number().int().positive().optional(),
  module: z.string().optional(),
  method: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

export type ActivityLogQuery = z.infer<typeof activityLogQuerySchema>

export const pageViewSchema = z.object({
  path: z.string().min(1).max(500),
  module: z.string().max(100).optional(),
})

export type PageViewDto = z.infer<typeof pageViewSchema>
