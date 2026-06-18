// src/types/users.ts

export interface UserRole {
  id: number;
  name: string;
}

export interface UserCompany {
  id: number;
  code: string;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: UserRole[];
  permissions: string[];          // list nama permission, derived dari roles
  companies: UserCompany[];
  last_login_at: string | null;
  created_at: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role_ids: number[];
  company_ids: number[];
}

export interface UpdateUserPayload {
  name?: string;
  role_ids?: number[];
  company_ids?: number[];
  is_active?: boolean;
}

export interface Company {
  id: number;
  code: string;
  name: string;
}