import { z } from 'zod'

// Toggle on/off SCHEDULER alert per company (task016 §19) — lihat komentar
// lengkap di schema-transaction.ts (tabel pareto_alert_settings).
export const upsertParetoAlertSettingSchema = z.object({
  company_id: z.number().int().positive(),
  scheduler_enabled: z.boolean(),
})

export const listParetoAlertSettingsQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
})

export type UpsertParetoAlertSettingDto = z.infer<typeof upsertParetoAlertSettingSchema>
export type ListParetoAlertSettingsQuery = z.infer<typeof listParetoAlertSettingsQuerySchema>
