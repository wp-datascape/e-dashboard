// src/hooks/useRbac.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/api/rbac.api';
import type { ApiError } from '@/types/api';
import type { Role, Permission, CreateRolePayload } from '@/types/rbac';

// ── Queries ───────────────────────────────────────────────────────────────────

export function useRbacRoles() {
  return useQuery<Role[], ApiError>({
    queryKey: ['rbac-roles'],
    queryFn: rbacApi.getRoles,
  });
}

export function useRbacPermissions(enabled: boolean) {
  return useQuery<Record<string, Permission[]>, ApiError>({
    queryKey: ['rbac-permissions'],
    queryFn: rbacApi.getPermissions,
    enabled,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateRoleMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation<Role, ApiError, CreateRolePayload>({
    mutationFn: rbacApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      onSuccess?.();
    },
  });
}

export function useDeleteRoleMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      onSuccess?.();
    },
  });
}

export function useUpdateRolePermissionsMutation(
  onSuccess?: (updatedRole: Role) => void,
  onError?: () => void
) {
  const queryClient = useQueryClient();
  return useMutation<Role, ApiError, { id: number; permission_ids: number[] }>({
    mutationFn: ({ id, permission_ids }: { id: number; permission_ids: number[] }) =>
      rbacApi.updateRolePermissions(id, { permission_ids }),
    onSuccess: (updatedRole: Role) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      onSuccess?.(updatedRole);
    },
    onError,
  });
}
