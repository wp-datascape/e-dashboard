// src/hooks/useRbac.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/api/rbac.api';
import type { Role } from '@/types/rbac';

// ── Queries ───────────────────────────────────────────────────────────────────

export function useRbacRoles() {
  return useQuery({
    queryKey: ['rbac-roles'],
    queryFn: rbacApi.getRoles,
  });
}

export function useRbacPermissions(enabled: boolean) {
  return useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: rbacApi.getPermissions,
    enabled,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateRoleMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rbacApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      onSuccess?.();
    },
  });
}

export function useDeleteRoleMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
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
  return useMutation({
    mutationFn: ({ id, permission_ids }: { id: number; permission_ids: number[] }) =>
      rbacApi.updateRolePermissions(id, { permission_ids }),
    onSuccess: (updatedRole: Role) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      onSuccess?.(updatedRole);
    },
    onError,
  });
}
