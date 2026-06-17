// frontend/src/mocks/handlers/rbac.handler.ts
import { http, HttpResponse } from 'msw';
import type { Role, Permission } from '@/types/rbac';

export type { Role, Permission };

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const allPermissions: Permission[] = [
  // Dashboard & Metrics
  { id: 1, name: 'metrics:menu',   description: 'Menu Dashboard',           group_name: 'Dashboard & Metrics' },
  { id: 2, name: 'metrics:view',   description: 'View Dashboard & Metrik',  group_name: 'Dashboard & Metrics' },
  
  // Customers
  { id: 3, name: 'customers:menu',   description: 'Menu Customer',         group_name: 'Customers' },
  { id: 4, name: 'customers:view',   description: 'View Customer',         group_name: 'Customers' },
  { id: 5, name: 'customers:input',  description: 'Input Customer Baru',   group_name: 'Customers' },
  { id: 6, name: 'customers:update', description: 'Update Customer',       group_name: 'Customers' },
  { id: 7, name: 'customers:delete', description: 'Delete Customer',       group_name: 'Customers' },
  
  // Products
  { id: 8,  name: 'products:menu',   description: 'Menu Product',         group_name: 'Products' },
  { id: 9,  name: 'products:view',   description: 'View Product',         group_name: 'Products' },
  { id: 10, name: 'products:input',  description: 'Input Product Baru',   group_name: 'Products' },
  { id: 11, name: 'products:update', description: 'Update Product',       group_name: 'Products' },
  { id: 12, name: 'products:delete', description: 'Delete Product',       group_name: 'Products' },
  
  // Transactions
  { id: 13, name: 'transactions:menu',   description: 'Menu Transaksi',       group_name: 'Transactions' },
  { id: 14, name: 'transactions:view',   description: 'View Transaksi',       group_name: 'Transactions' },
  { id: 15, name: 'transactions:input',  description: 'Input Transaksi Baru', group_name: 'Transactions' },
  { id: 16, name: 'transactions:update', description: 'Update Transaksi',     group_name: 'Transactions' },
  { id: 17, name: 'transactions:delete', description: 'Delete Transaksi',     group_name: 'Transactions' },
  
  // Import
  { id: 18, name: 'import:menu',  description: 'Menu Import',          group_name: 'Import' },
  { id: 19, name: 'import:view',  description: 'View Log Import',      group_name: 'Import' },
  { id: 20, name: 'import:input', description: 'Import Faktur',        group_name: 'Import' },
  
  // Users
  { id: 21, name: 'users:menu',   description: 'Menu Users',           group_name: 'Users' },
  { id: 22, name: 'users:view',   description: 'View Users',           group_name: 'Users' },
  { id: 23, name: 'users:input',  description: 'Input User Baru',      group_name: 'Users' },
  { id: 24, name: 'users:update', description: 'Update User',          group_name: 'Users' },
  { id: 25, name: 'users:delete', description: 'Delete User',          group_name: 'Users' },
  
  // RBAC
  { id: 26, name: 'rbac:menu',   description: 'Menu Roles',            group_name: 'RBAC' },
  { id: 27, name: 'rbac:view',   description: 'View Roles',            group_name: 'RBAC' },
  { id: 28, name: 'rbac:input',  description: 'Input Role Baru',       group_name: 'RBAC' },
  { id: 29, name: 'rbac:update', description: 'Update Role',           group_name: 'RBAC' },
  { id: 30, name: 'rbac:delete', description: 'Delete Role',           group_name: 'RBAC' },
  
  // Config
  { id: 31, name: 'config:menu',   description: 'Menu Config',         group_name: 'Config' },
  { id: 32, name: 'config:view',   description: 'View Config',         group_name: 'Config' },
  { id: 33, name: 'config:update', description: 'Update Config',       group_name: 'Config' },
  
  // Audit Log
  { id: 34, name: 'audit:menu', description: 'Menu Audit Log',         group_name: 'Audit Log' },
  { id: 35, name: 'audit:view', description: 'View Audit Log',         group_name: 'Audit Log' },
];

let roles: Role[] = [
  {
    id: 1, name: 'superadmin', description: 'Akses penuh sistem', is_system: true,
    permissions: allPermissions, // All permissions
  },
  {
    id: 2, name: 'admin', description: 'Import data, manage user & RBAC', is_system: true,
    permissions: allPermissions.filter(p =>
      // Dashboard & Metrics: menu + view
      p.name === 'metrics:menu' || p.name === 'metrics:view' ||
      // Customers: menu + view
      p.name === 'customers:menu' || p.name === 'customers:view' ||
      // Products: menu + view
      p.name === 'products:menu' || p.name === 'products:view' ||
      // Transactions: menu + view
      p.name === 'transactions:menu' || p.name === 'transactions:view' ||
      // Import: all
      p.name === 'import:menu' || p.name === 'import:view' || p.name === 'import:input' ||
      // Users: all
      p.name === 'users:menu' || p.name === 'users:view' || p.name === 'users:input' || 
      p.name === 'users:update' || p.name === 'users:delete' ||
      // RBAC: all
      p.name === 'rbac:menu' || p.name === 'rbac:view' || p.name === 'rbac:input' || 
      p.name === 'rbac:update' || p.name === 'rbac:delete' ||
      // Config: menu + view
      p.name === 'config:menu' || p.name === 'config:view' ||
      // Audit: all
      p.name === 'audit:menu' || p.name === 'audit:view'
    ),
  },
  {
    id: 3, name: 'manager', description: 'View semua metrik & data', is_system: true,
    permissions: allPermissions.filter(p =>
      // Dashboard & Metrics: menu + view
      p.name === 'metrics:menu' || p.name === 'metrics:view' ||
      // Customers: menu + view
      p.name === 'customers:menu' || p.name === 'customers:view' ||
      // Products: menu + view
      p.name === 'products:menu' || p.name === 'products:view' ||
      // Transactions: menu + view
      p.name === 'transactions:menu' || p.name === 'transactions:view' ||
      // Import: menu + view (no input)
      p.name === 'import:menu' || p.name === 'import:view' ||
      // Config: menu + view (no update)
      p.name === 'config:menu' || p.name === 'config:view' ||
      // Audit: menu + view
      p.name === 'audit:menu' || p.name === 'audit:view'
    ),
  },
  {
    id: 4, name: 'sales', description: 'View metrik & customer (read-only)', is_system: true,
    permissions: allPermissions.filter(p =>
      // Dashboard & Metrics: menu + view
      p.name === 'metrics:menu' || p.name === 'metrics:view' ||
      // Customers: menu + view
      p.name === 'customers:menu' || p.name === 'customers:view' ||
      // Products: menu + view
      p.name === 'products:menu' || p.name === 'products:view' ||
      // Transactions: menu + view
      p.name === 'transactions:menu' || p.name === 'transactions:view'
    ),
  },
  {
    id: 5, name: 'executive', description: 'View-only dashboard', is_system: true,
    permissions: allPermissions.filter(p =>
      // Dashboard & Metrics: menu + view only
      p.name === 'metrics:menu' || p.name === 'metrics:view'
    ),
  },
];

let nextRoleId = 6;

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const rbacHandlers = [
  // GET /rbac/roles — daftar semua role beserta permission-nya
  http.get(`${BASE_URL}/rbac/roles`, () => {
    return HttpResponse.json({ message: 'OK', data: roles }, { status: 200 });
  }),

  // POST /rbac/roles — buat role baru
  http.post(`${BASE_URL}/rbac/roles`, async ({ request }) => {
    const body = await request.json() as { name: string; description?: string };
    if (!body.name) {
      return HttpResponse.json({ error: 'VALIDATION_ERROR', message: 'Nama role wajib diisi' }, { status: 422 });
    }
    if (roles.find(r => r.name === body.name)) {
      return HttpResponse.json({ error: 'CONFLICT', message: 'Nama role sudah digunakan' }, { status: 409 });
    }
    const newRole: Role = {
      id: nextRoleId++,
      name: body.name,
      description: body.description ?? '',
      is_system: false,
      permissions: [],
    };
    roles = [...roles, newRole];
    return HttpResponse.json({ message: 'Role berhasil dibuat', data: newRole }, { status: 201 });
  }),

  // PUT /rbac/roles/:id — update deskripsi role
  http.put(`${BASE_URL}/rbac/roles/:id`, async ({ params, request }) => {
    const id = Number(params.id);
    const role = roles.find(r => r.id === id);
    if (!role) return HttpResponse.json({ error: 'NOT_FOUND', message: 'Role tidak ditemukan' }, { status: 404 });
    if (role.is_system) return HttpResponse.json({ error: 'FORBIDDEN', message: 'Role sistem tidak bisa diubah' }, { status: 403 });
    const body = await request.json() as { description?: string };
    roles = roles.map(r => r.id === id ? { ...r, description: body.description ?? r.description } : r);
    return HttpResponse.json({ message: 'Role berhasil diperbarui', data: roles.find(r => r.id === id) }, { status: 200 });
  }),

  // DELETE /rbac/roles/:id — hapus role
  http.delete(`${BASE_URL}/rbac/roles/:id`, ({ params }) => {
    const id = Number(params.id);
    const role = roles.find(r => r.id === id);
    if (!role) return HttpResponse.json({ error: 'NOT_FOUND', message: 'Role tidak ditemukan' }, { status: 404 });
    if (role.is_system) return HttpResponse.json({ error: 'FORBIDDEN', message: 'Role sistem tidak bisa dihapus' }, { status: 403 });
    roles = roles.filter(r => r.id !== id);
    return HttpResponse.json({ message: 'Role berhasil dihapus' }, { status: 200 });
  }),

  // PUT /rbac/roles/:id/permissions — set permission untuk role
  http.put(`${BASE_URL}/rbac/roles/:id/permissions`, async ({ params, request }) => {
    const id = Number(params.id);
    const role = roles.find(r => r.id === id);
    if (!role) return HttpResponse.json({ error: 'NOT_FOUND', message: 'Role tidak ditemukan' }, { status: 404 });
    const body = await request.json() as { permission_ids: number[] };
    const updatedPermissions = allPermissions.filter(p => body.permission_ids.includes(p.id));
    roles = roles.map(r => r.id === id ? { ...r, permissions: updatedPermissions } : r);
    return HttpResponse.json({ message: 'Permission berhasil diperbarui', data: roles.find(r => r.id === id) }, { status: 200 });
  }),

  // GET /rbac/permissions — daftar semua permission digroup
  http.get(`${BASE_URL}/rbac/permissions`, () => {
    const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
      if (!acc[p.group_name]) acc[p.group_name] = [];
      acc[p.group_name].push(p);
      return acc;
    }, {});
    return HttpResponse.json({ message: 'OK', data: grouped }, { status: 200 });
  }),
];