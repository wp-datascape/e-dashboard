import { z } from 'zod'

export const branchIdParamSchema = z.object({
  branchId: z.coerce.number().int().positive(),
})

export const saveCredentialsSchema = z.object({
  branch_id: z.number().int().positive(),
  auth_method: z.enum(['api_token', 'oauth']).optional().default('api_token'),
  // API Token method
  api_token: z.string().min(1).optional(),
  signature_secret: z.string().min(1).optional(),
  // OAuth method
  app_key: z.string().min(1).optional(),
  signature_secret_oauth: z.string().min(1).optional(),
  client_id: z.string().min(1).optional(),
  client_secret: z.string().min(1).optional(),
  callback_url: z.string().url().optional().or(z.literal('')),
  // Common fields
  subdomain: z.string().min(1),
  company_db_id: z.string().min(1).optional(),
})

export const testConnectionSchema = z.object({
  subdomain: z.string().min(1),
  api_token: z.string().min(1),
  signature_secret: z.string().min(1),
})

export type SaveCredentialsDto = z.infer<typeof saveCredentialsSchema>
export type TestConnectionDto = z.infer<typeof testConnectionSchema>