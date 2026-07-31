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

export type UpsertResendSettingsDto = z.infer<typeof upsertResendSettingsSchema>
export type SendTestEmailDto = z.infer<typeof sendTestEmailSchema>
