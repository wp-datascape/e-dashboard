import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '@/api/companies.api'
import type { ApiError } from '@/types/api'
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '@/types/companies'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const companiesKeys = {
  all: ['companies'] as const,
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: companiesKeys.all,
    queryFn: () => companiesApi.getCompanies(),
  })
}

export function useCompanyById(id: number | null) {
  return useQuery<Company>({
    queryKey: ['companies', id],
    queryFn: () => companiesApi.getCompanyById(id!),
    enabled: id !== null,
  })
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation<Company, ApiError, CreateCompanyPayload>({
    mutationFn: (payload: CreateCompanyPayload) => companiesApi.createCompany(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation<Company, ApiError, { id: number; payload: UpdateCompanyPayload }>({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCompanyPayload }) =>
      companiesApi.updateCompany(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, number>({
    mutationFn: (id: number) => companiesApi.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all })
    },
  })
}