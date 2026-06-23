import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '@/api/companies.api'
import type { ApiError } from '@/types/api'
import type {
  Company,
  CompanyBranch,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  CreateBranchPayload,
  UpdateBranchPayload,
} from '@/types/companies'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const companiesKeys = {
  all: ['companies'] as const,
  branches: (companyId: number) => ['companies', companyId, 'branches'] as const,
}

// ─── Company Query Hooks ─────────────────────────────────────────────────────

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

// ─── Company Mutation Hooks ─────────────────────────────────────────────────

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

// ─── Branch Query Hooks ──────────────────────────────────────────────────────

export function useBranchesByCompany(companyId: number | null) {
  return useQuery<CompanyBranch[]>({
    queryKey: companiesKeys.branches(companyId!),
    queryFn: () => companiesApi.getBranchesByCompany(companyId!),
    enabled: companyId !== null && companyId !== undefined,
  })
}

// ─── Branch Mutation Hooks ─────────────────────────────────────────────────

export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation<CompanyBranch, ApiError, { companyId: number; payload: CreateBranchPayload }>({
    mutationFn: ({ companyId, payload }) => companiesApi.createBranch(companyId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.branches(variables.companyId) })
      queryClient.invalidateQueries({ queryKey: companiesKeys.all })
    },
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()
  return useMutation<CompanyBranch, ApiError, { branchId: number; companyId: number; payload: UpdateBranchPayload }>({
    mutationFn: ({ branchId, companyId, payload }) =>
      companiesApi.updateBranch(branchId, companyId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.branches(variables.companyId) })
      queryClient.invalidateQueries({ queryKey: companiesKeys.all })
    },
  })
}

export function useDeleteBranch() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, { branchId: number; companyId: number }>({
    mutationFn: ({ branchId, companyId }) => companiesApi.deleteBranch(branchId, companyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.branches(variables.companyId) })
      queryClient.invalidateQueries({ queryKey: companiesKeys.all })
    },
  })
}
