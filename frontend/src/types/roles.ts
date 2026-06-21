export interface Role {
  id: number
  name: string
  description?: string | null
  is_system?: boolean
  isSystem?: boolean
  permissions?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateRolePayload {
  name: string
  description?: string
}

export interface UpdateRolePayload {
  description?: string
}