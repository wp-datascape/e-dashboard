export interface Company {
  id: number
  code: string
  name: string
  created_at?: string
  updated_at?: string
}

export interface CompanyBranch {
  id: number
  company_id: number
  name: string
  code: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CreateCompanyPayload {
  code: string
  name: string
}

export interface UpdateCompanyPayload {
  code?: string
  name?: string
}

export interface CreateBranchPayload {
  name: string
  code: string
  is_active?: boolean
}

export interface UpdateBranchPayload {
  name?: string
  code?: string
  is_active?: boolean
}

export interface CompanyWithBranches extends Company {
  branches?: CompanyBranch[]
}