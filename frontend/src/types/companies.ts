export interface Company {
  id: number
  code: string
  name: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateCompanyPayload {
  code: string
  name: string
}

export interface UpdateCompanyPayload {
  code?: string
  name?: string
}