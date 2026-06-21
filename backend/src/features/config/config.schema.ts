import { z } from 'zod'

export const configKeyParamSchema = z.object({
  key: z.string().min(1),
})

export const updateConfigSchema = z.object({
  value: z.string().min(1),
})