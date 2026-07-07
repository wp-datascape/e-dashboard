import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/axios'
import { useAuth } from '@/context/auth.context'

export interface MyScopeBranch {
  branch_id: number
  branch_name: string
  isFullDivisionAccess: boolean
  divisions: string[]
}

export interface MyScopeCompany {
  company_id: number
  company_name: string
  isFullBranchAccess: boolean
  branches: MyScopeBranch[]
}

export interface MyScope {
  isSuperAdmin: boolean
  companies: MyScopeCompany[]
}

const UNRESTRICTED_SCOPE: MyScope = { isSuperAdmin: true, companies: [] }

/**
 * Pohon Company->Branch->Division milik user sendiri (GET /auth/me `scope`),
 * dipakai populate dropdown filter Dashboard/Workbench sesuai level akses -
 * lihat docs-v2/task/task001.md §4. Query key sama dgn App.tsx ('me') supaya
 * berbagi cache, tidak fetch dua kali.
 *
 * isSuperAdmin / companies=[] berarti unrestricted - caller fallback ke daftar
 * company/branch/division penuh (useCompanies/useBranchesByCompany/enum tetap).
 */
export function useMyScope(): MyScope {
  const { token } = useAuth()
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data),
    enabled: !!token,
    staleTime: 0,
  })
  return (data?.scope as MyScope | undefined) ?? UNRESTRICTED_SCOPE
}
