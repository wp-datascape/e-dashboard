/**
 * features/permissions/permissions.schema.ts
 *
 * Zod validation schemas untuk Permission CRUD operations.
 * Digunakan di service layer untuk validasi input sebelum ke database.
 */

import { z } from 'zod'

export const createPermissionSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9.:_-]+$/, 'Permission name hanya boleh lowercase alphanumeric, dots, colons, underscores, hyphens'),
  description: z.string().optional(),
  category: z.string().min(1).max(50).optional(),
})

export const updatePermissionSchema = z.object({
  description: z.string().optional(),
  category: z.string().min(1).max(50).optional(),
})

export const permissionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreatePermissionDto = z.infer<typeof createPermissionSchema>
export type UpdatePermissionDto = z.infer<typeof updatePermissionSchema>