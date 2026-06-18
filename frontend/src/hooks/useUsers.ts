// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import type { ApiError } from '@/types/api';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types/users';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const usersKeys = {
  all: ['users'] as const,
  companies: ['companies'] as const,
};

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: usersKeys.all,
    queryFn: () => usersApi.getUsers(),
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: usersKeys.companies,
    queryFn: () => usersApi.getCompanies(),
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<User, ApiError, CreateUserPayload>({
    mutationFn: (payload: CreateUserPayload) => usersApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation<User, ApiError, { id: number; payload: UpdateUserPayload }>({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}