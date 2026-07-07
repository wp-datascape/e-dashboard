import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export type LoginDto = z.infer<typeof loginSchema>

// Daftar palette valid (Task003) — harus sinkron dengan frontend/src/theme/palettes.ts
export const COLOR_PALETTES = ['blue', 'green', 'yellow', 'purple', 'rose', 'indigo'] as const

// Semua field optional - PATCH partial, cuma field yang dikirim yang di-update (merge,
// bukan replace penuh kolom preferences JSONB - lihat updateUserPreferences()).
export const updatePreferencesSchema = z.object({
  theme_mode: z.enum(['light', 'dark']).optional(),
  color_palette: z.enum(COLOR_PALETTES).optional(),
  language: z.string().min(2).max(10).optional(),
})

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>
