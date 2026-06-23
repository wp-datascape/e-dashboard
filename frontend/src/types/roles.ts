export interface Role {
  id: number
  name: string
  description?: string | null
  is_system?: boolean
  is_system?: boolean
  permissions?: string[]
  created_at?: string
  updated_at?: string
}

export interface CreateRolePayload {
  name: string
  description?: string
}

export interface UpdateRolePayload {
  description?: string
}