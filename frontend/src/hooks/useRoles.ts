import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from '@/api/roles.api'
import type { ApiError } from '@/types/api'
import type { Role, CreateRolePayload, UpdateRolePayload } from '@/types/roles'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const rolesKeys = {
  all: ['roles'] as const,
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: rolesKeys.all,
    queryFn: () => rolesApi.getRoles(),
  })
}

export function useRoleById(id: number | null) {
  return useQuery<Role>({
    queryKey: ['roles', id],
    queryFn: () => rolesApi.getRoleById(id!),
    enabled: id !== null,
  })
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation<Role, ApiError, CreateRolePayload>({
    mutationFn: (payload: CreateRolePayload) => rolesApi.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.all })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation<Role, ApiError, { id: number; payload: UpdateRolePayload }>({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRolePayload }) =>
      rolesApi.updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.all })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: (id: number) => rolesApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.all })
    },
  })
}