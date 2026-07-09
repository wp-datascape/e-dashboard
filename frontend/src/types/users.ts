// src/types/users.ts

export interface UserRole {
  id: number;
  name: string;
  is_system?: boolean;
}

export interface UserCompany {
  id: number;
  code: string;
  name: string;
}

// Isolasi data Company/Branch/Division (docs-v2/task/task001.md).
// Dulu union tetap 7 nilai (DIVISION_VALUES) — sekarang string dinamis per
// company/branch, diambil dari katalog `divisions` (task004/task005 Session C).
export type DivisionValue = string;

export interface BranchAssignment {
  branch_id: number;
  divisions: DivisionValue[];
}

export interface CompanyAssignment {
  company_id: number;
  branches: BranchAssignment[];
}

// Versi dengan nama (branch_name/company_name) - dipakai untuk render tree,
// dikembalikan backend di response GET /users (list + detail).
export interface BranchAssignmentView extends BranchAssignment {
  branch_name: string;
}
export interface CompanyAssignmentView {
  company_id: number;
  company_name: string;
  branches: BranchAssignmentView[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: UserRole[];
  permissions: string[];          // list nama permission, derived dari roles
  companies: UserCompany[];
  company_assignments: CompanyAssignmentView[];
  last_login_at: string | null;
  created_at: string;
  locked_until: string | null; // Task002 Task C — akun terkunci kalau ini di masa depan
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role_ids: number[];
  company_assignments: CompanyAssignment[];
}

export interface UpdateUserPayload {
  name?: string;
  role_ids?: number[];
  company_assignments?: CompanyAssignment[];
  is_active?: boolean;
  password?: string;
}

export interface Company {
  id: number;
  code: string;
  name: string;
}