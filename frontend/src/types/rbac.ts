// src/types/rbac.ts

export interface Permission {
  id: number;
  name: string;
  description?: string | null;
  group_name?: string;
  category?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  is_system?: boolean;
  permissions?: Permission[] | string[];
}

export interface CreateRolePayload {
  name: string;
  description: string;
}

export interface UpdateRolePermissionsPayload {
  permission_ids: number[];
}

export interface CreatePermissionPayload {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdatePermissionPayload {
  description?: string;
  category?: string;
}
