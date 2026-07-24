import { z } from 'zod'

export const loginLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(200).optional().default(50),
  user_id: z.coerce.number().int().positive().optional(),
  event: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

export type LoginLogQuery = z.infer<typeof loginLogQuerySchema>
