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

// locale optional — dikirim frontend dari bahasa UI aktif (i18n.language,
// task016 §30), fallback 'id' di service kalau tidak dikirim.
export const sendTestEmailSchema = z.object({
  to: z.string().email(),
  // String bebas (bukan z.enum(['id','en'])) — browser kadang lapor kode
  // region penuh (mis. 'en-US'); dinormalisasi ke 'id'/'en' via resolveLocale()
  // di service, BUKAN divalidasi ketat di sini (supaya tidak 400 gara-gara
  // format locale yang secara linguistik sebenarnya valid).
  locale: z.string().max(10).optional(),
})

// "Kirim Laporan Manual" (task016 §29, revisi 2026-08-01 — GANTI TOTAL dari
// simulasi trigger lama) — admin pilih sendiri period_type + tanggal akhir
// BEBAS (tidak terikat siklus trigger scheduler), datanya real dari DB via
// generateAnalisis() yang sama persis dipakai halaman Analisis.
export const sendTestDigestEmailSchema = z.object({
  to: z.string().email(),
  period_type: z.enum(['monthly', 'quarter', 'semester', 'ytd', 'annual']),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // String bebas (bukan z.enum(['id','en'])) — browser kadang lapor kode
  // region penuh (mis. 'en-US'); dinormalisasi ke 'id'/'en' via resolveLocale()
  // di service, BUKAN divalidasi ketat di sini (supaya tidak 400 gara-gara
  // format locale yang secara linguistik sebenarnya valid).
  locale: z.string().max(10).optional(),
})

export type UpsertResendSettingsDto = z.infer<typeof upsertResendSettingsSchema>
export type SendTestEmailDto = z.infer<typeof sendTestEmailSchema>
export type SendTestDigestEmailDto = z.infer<typeof sendTestDigestEmailSchema>
