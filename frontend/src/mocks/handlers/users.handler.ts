// frontend/src/mocks/handlers/users.handler.ts
import { http, HttpResponse } from 'msw';
import type { User, Company } from '@/types/users';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ─── Master Data ──────────────────────────────────────────────────────────────

export const mockCompanies: Company[] = [
  { id: 1, code: 'PT_ABC', name: 'PT ABC Sejahtera' },
  { id: 2, code: 'PT_XYZ', name: 'PT XYZ Mandiri' },
  { id: 3, code: 'PT_DEF', name: 'PT DEF Utama' },
];

const mockRoles = [
  { id: 1, name: 'superadmin' },
  { id: 2, name: 'admin' },
  { id: 3, name: 'manager' },
  { id: 4, name: 'sales' },
  { id: 5, name: 'executive' },
];

/** Permission per role — sesuai rbac.handler.ts */
const rolePermissionsMap: Record<string, string[]> = {
  superadmin: [
    'metrics:menu', 'metrics:view',
    'customers:menu', 'customers:view', 'customers:input', 'customers:update', 'customers:delete',
    'products:menu', 'products:view', 'products:input', 'products:update', 'products:delete',
    'transactions:menu', 'transactions:view', 'transactions:input', 'transactions:update', 'transactions:delete',
    'import:menu', 'import:view', 'import:input',
    'users:menu', 'users:view', 'users:input', 'users:update', 'users:delete',
    'rbac:menu', 'rbac:view', 'rbac:input', 'rbac:update', 'rbac:delete',
    'config:menu', 'config:view', 'config:update',
    'audit:menu', 'audit:view',
  ],
  admin: [
    'metrics:menu', 'metrics:view',
    'customers:menu', 'customers:view',
    'products:menu', 'products:view',
    'transactions:menu', 'transactions:view',
    'import:menu', 'import:view', 'import:input',
    'users:menu', 'users:view', 'users:input', 'users:update', 'users:delete',
    'rbac:menu', 'rbac:view', 'rbac:input', 'rbac:update', 'rbac:delete',
    'config:menu', 'config:view',
    'audit:menu', 'audit:view',
  ],
  manager: [
    'metrics:menu', 'metrics:view',
    'customers:menu', 'customers:view',
    'products:menu', 'products:view',
    'transactions:menu', 'transactions:view',
    'import:menu', 'import:view',
    'config:menu', 'config:view',
    'audit:menu', 'audit:view',
  ],
  sales: [
    'metrics:menu', 'metrics:view',
    'customers:menu', 'customers:view',
    'products:menu', 'products:view',
    'transactions:menu', 'transactions:view',
  ],
  executive: [
    'metrics:menu', 'metrics:view',
  ],
};

/** Derive unique permissions dari array role names */
const derivePermissions = (roleNames: string[]): string[] => {
  const set = new Set<string>();
  for (const name of roleNames) {
    for (const perm of rolePermissionsMap[name] ?? []) {
      set.add(perm);
    }
  }
  return Array.from(set).sort();
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

let users: User[] = [
  {
    id: 1,
    name: 'Super Admin',
    email: 'superadmin@holding.co.id',
    is_active: true,
    roles: [{ id: 1, name: 'superadmin' }],
    permissions: derivePermissions(['superadmin']),
    companies: mockCompanies,
    last_login_at: '2026-06-18T09:15:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Budi Santoso',
    email: 'budi@holding.co.id',
    is_active: true,
    roles: [{ id: 2, name: 'admin' }],
    permissions: derivePermissions(['admin']),
    companies: mockCompanies,
    last_login_at: '2026-06-17T14:30:00Z',
    created_at: '2025-02-15T08:00:00Z',
  },
  {
    id: 3,
    name: 'Sari Dewi',
    email: 'sari@ptabc.co.id',
    is_active: true,
    roles: [{ id: 3, name: 'manager' }],
    permissions: derivePermissions(['manager']),
    companies: [mockCompanies[0]],
    last_login_at: '2026-06-18T08:00:00Z',
    created_at: '2025-03-01T08:00:00Z',
  },
  {
    id: 4,
    name: 'Ahmad Fauzi',
    email: 'ahmad@ptabc.co.id',
    is_active: true,
    roles: [{ id: 4, name: 'sales' }],
    permissions: derivePermissions(['sales']),
    companies: [mockCompanies[0]],
    last_login_at: '2026-06-16T10:00:00Z',
    created_at: '2025-04-10T08:00:00Z',
  },
  {
    id: 5,
    name: 'Rina Wulandari',
    email: 'rina@ptxyz.co.id',
    is_active: false,
    roles: [{ id: 4, name: 'sales' }],
    permissions: derivePermissions(['sales']),
    companies: [mockCompanies[1]],
    last_login_at: null,
    created_at: '2025-05-20T08:00:00Z',
  },
  {
    id: 6,
    name: 'Direktur Utama',
    email: 'direktur@holding.co.id',
    is_active: true,
    roles: [{ id: 5, name: 'executive' }],
    permissions: derivePermissions(['executive']),
    companies: mockCompanies,
    last_login_at: '2026-06-15T16:00:00Z',
    created_at: '2025-01-15T08:00:00Z',
  },
];

let nextId = 7;

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const usersHandlers = [
  // GET /users — daftar semua user
  http.get(`${BASE_URL}/users`, () => {
    return HttpResponse.json({ message: 'OK', data: users }, { status: 200 });
  }),

  // GET /companies — daftar perusahaan (dipakai di form user)
  http.get(`${BASE_URL}/companies`, () => {
    return HttpResponse.json({ message: 'OK', data: mockCompanies }, { status: 200 });
  }),

  // POST /users — buat user baru
  http.post(`${BASE_URL}/users`, async ({ request }) => {
    const body = await request.json() as {
      name: string;
      email: string;
      password: string;
      role_ids: number[];
      company_ids: number[];
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
      return HttpResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Name, email, dan password wajib diisi' },
        { status: 422 },
      );
    }
    if (users.find(u => u.email === body.email)) {
      return HttpResponse.json(
        { error: 'CONFLICT', message: 'Email sudah terdaftar' },
        { status: 409 },
      );
    }

    const selectedRoles = mockRoles.filter(r => body.role_ids.includes(r.id));

    const newUser: User = {
      id: nextId++,
      name: body.name.trim(),
      email: body.email.trim(),
      is_active: true,
      roles: selectedRoles,
      permissions: derivePermissions(selectedRoles.map(r => r.name)),
      companies: mockCompanies.filter(c => body.company_ids.includes(c.id)),
      last_login_at: null,
      created_at: new Date().toISOString(),
    };

    users = [...users, newUser];
    return HttpResponse.json({ message: 'User berhasil dibuat', data: newUser }, { status: 201 });
  }),

  // PUT /users/:id — update user
  http.put(`${BASE_URL}/users/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const user = users.find(u => u.id === id);
    if (!user) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'User tidak ditemukan' },
        { status: 404 },
      );
    }

    const body = await request.json() as {
      name?: string;
      role_ids?: number[];
      company_ids?: number[];
      is_active?: boolean;
    };

    const selectedRoles = body.role_ids
      ? mockRoles.filter(r => body.role_ids!.includes(r.id))
      : user.roles;

    const updatedUser: User = {
      ...user,
      name: body.name?.trim() ?? user.name,
      is_active: body.is_active ?? user.is_active,
      roles: selectedRoles,
      permissions: derivePermissions(selectedRoles.map(r => r.name)),
      companies: body.company_ids
        ? mockCompanies.filter(c => body.company_ids!.includes(c.id))
        : user.companies,
    };

    users = users.map(u => (u.id === id ? updatedUser : u));
    return HttpResponse.json({ message: 'User berhasil diperbarui', data: updatedUser }, { status: 200 });
  }),

  // DELETE /users/:id — soft delete
  http.delete(`${BASE_URL}/users/:id`, ({ params }) => {
    const id = Number(params.id);
    if (!users.find(u => u.id === id)) {
      return HttpResponse.json(
        { error: 'NOT_FOUND', message: 'User tidak ditemukan' },
        { status: 404 },
      );
    }
    users = users.filter(u => u.id !== id);
    return HttpResponse.json({ message: 'User berhasil dihapus' }, { status: 200 });
  }),
];