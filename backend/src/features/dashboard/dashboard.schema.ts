import { z } from 'zod'

export const dashboardQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  // Filter laporan — string bebas (bukan enum hardcode), dinamis per company/branch,
  // lihat docs-v2/task/task004.md. Kode tidak valid cukup hasilkan list kosong.
  division: z.string().min(1).max(50).optional(),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
