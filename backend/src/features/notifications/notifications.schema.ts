import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  // z.coerce.boolean() SALAH untuk query string (lihat task016 —
  // feedback_zod_coerce_boolean_query_string): Boolean("false") === true.
  unread_only: z.string().optional().default('false').transform(v => v === 'true'),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
