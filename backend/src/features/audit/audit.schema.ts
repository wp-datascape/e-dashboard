import { z } from 'zod'

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(200).optional().default(50),
  action: z.string().optional(),
  actor_id: z.coerce.number().int().positive().optional(),
  company_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

export type AuditQuery = z.infer<typeof auditQuerySchema>