export interface Company {
  id: number
  code: string
  name: string
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