import { z } from 'zod'

// Semua field optional saat update — admin bisa update sebagian (mis. cuma
// toggle is_active tanpa ubah api_key) tanpa perlu kirim ulang field lain.
export const upsertResendSettingsSchema = z.object({
  api_key: z.string().optional(),
  sender_email: z.string().email().optional().or(z.literal('')),
  sender_name_default: z.string().optional(),
  app_base_url: z.string().url().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
})

export const sendTestEmailSchema = z.object({
  to: z.string().email(),
})

// Filter trigger utk preview "Kirim Contoh Laporan" (task016 §24) — 'all' =
// gabung semua (default lama), atau simulasi 1 trigger spesifik saja supaya
// admin bisa cek satu per satu, bukan selalu gabungan besar.
export const sendTestDigestEmailSchema = z.object({
  to: z.string().email(),
  trigger: z.enum(['all', 'mid_month', 'monthly', 'quarter', 'semester', 'annual']).optional().default('all'),
})

export type UpsertResendSettingsDto = z.infer<typeof upsertResendSettingsSchema>
export type SendTestEmailDto = z.infer<typeof sendTestEmailSchema>
export type SendTestDigestEmailDto = z.infer<typeof sendTestDigestEmailSchema>
