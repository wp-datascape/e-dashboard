// src/types/rbac.ts

export interface Permission {
  id: number;
  name: string;
  description: string;
  group_name: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
  permissions: Permission[];
}

export interface CreateRolePayload {
  name: string;
  description: string;
}

export interface UpdateRolePermissionsPayload {
  permission_ids: number[];
}