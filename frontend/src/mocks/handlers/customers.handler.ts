// frontend/src/mocks/handlers/customers.handler.ts
import { http, HttpResponse } from 'msw';
import type { PaginatedResponse } from '@/types/api';
import type { Customer360Row, Customer360Detail } from '@/types/customers';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const mockCustomers: Customer360Row[] = [
  {
    id: 1,
    customer_code: 'CUST-001',
    name: 'PT Maju Bersama',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'b2b_dc',
    status: 'active',
    first_invoice_date: '2022-03-15',
    last_invoice_date: '2024-01-20',
    category_count: 3,
    avg_monthly_revenue: 15000000,
    lifetime_value: 540000000,
    total_invoices: 36,
  },
  {
    id: 2,
    customer_code: 'CUST-002',
    name: 'CV Teknologi Nusantara',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'b2b_dc',
    status: 'active',
    first_invoice_date: '2021-06-10',
    last_invoice_date: '2024-01-15',
    category_count: 2,
    avg_monthly_revenue: 8500000,
    lifetime_value: 289000000,
    total_invoices: 34,
  },
  {
    id: 3,
    customer_code: 'CUST-003',
    name: 'PT Solusi Digital',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'b2c',
    status: 'dormant',
    first_invoice_date: '2021-01-05',
    last_invoice_date: '2023-09-12',
    category_count: 1,
    avg_monthly_revenue: 3200000,
    lifetime_value: 108800000,
    total_invoices: 34,
  },
  {
    id: 4,
    customer_code: 'CUST-004',
    name: 'PT Industri Mandiri',
    company: { id: 2, name: 'PT XYZ Mandiri' },
    business_unit: 'manufacturing',
    status: 'active',
    first_invoice_date: '2023-01-20',
    last_invoice_date: '2024-01-18',
    category_count: 4,
    avg_monthly_revenue: 22000000,
    lifetime_value: 264000000,
    total_invoices: 12,
  },
  {
    id: 5,
    customer_code: 'CUST-005',
    name: 'PT Proyek Infrastruktur',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'b2b_project',
    status: 'new',
    first_invoice_date: '2024-01-05',
    last_invoice_date: '2024-01-05',
    category_count: 2,
    avg_monthly_revenue: 45000000,
    lifetime_value: 45000000,
    total_invoices: 1,
  },
  {
    id: 6,
    customer_code: 'CUST-006',
    name: 'CV Mitra Usaha',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: null,
    status: 'active',
    first_invoice_date: '2022-08-20',
    last_invoice_date: '2024-01-10',
    category_count: 2,
    avg_monthly_revenue: 6000000,
    lifetime_value: 102000000,
    total_invoices: 17,
  },
];

const mockCustomerDetail: Customer360Detail = {
  id: 1,
  customer_code: 'CUST-001',
  name: 'PT Maju Bersama',
  company: { id: 1, name: 'PT ABC Sejahtera' },
  business_unit: 'b2b_dc',
  status: 'active',
  first_invoice_date: '2022-03-15',
  last_invoice_date: '2024-01-20',
  lifetime_value: 540000000,
  avg_monthly_revenue: 15000000,
  category_count: 3,
  categories_bought: ['Scanner', 'Printer', 'Ribbon'],
  monthly_revenue_trend: [
    { month: '2023-02', revenue: 12000000, gp: 3600000 },
    { month: '2023-03', revenue: 14000000, gp: 4200000 },
    { month: '2023-04', revenue: 11000000, gp: 3300000 },
    { month: '2023-05', revenue: 16000000, gp: 4800000 },
    { month: '2023-06', revenue: 13000000, gp: 3900000 },
    { month: '2023-07', revenue: 15000000, gp: 4500000 },
    { month: '2023-08', revenue: 18000000, gp: 5400000 },
    { month: '2023-09', revenue: 14000000, gp: 4200000 },
    { month: '2023-10', revenue: 17000000, gp: 5100000 },
    { month: '2023-11', revenue: 19000000, gp: 5700000 },
    { month: '2023-12', revenue: 21000000, gp: 6300000 },
    { month: '2024-01', revenue: 18000000, gp: 5400000 },
  ],
  recent_invoices: [
    { invoice_number: 'INV-2024-001', invoice_date: '2024-01-20', total_revenue: 18000000, total_gp: 5400000 },
    { invoice_number: 'INV-2023-089', invoice_date: '2023-12-15', total_revenue: 21000000, total_gp: 6300000 },
    { invoice_number: 'INV-2023-078', invoice_date: '2023-11-10', total_revenue: 19000000, total_gp: 5700000 },
  ],
};

export const customersHandlers = [
  // GET /customers/360 — list
  http.get(`${BASE_URL}/customers/360`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const statusFilter = url.searchParams.get('status');
    const buFilter = url.searchParams.get('business_unit');
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const perPage = parseInt(url.searchParams.get('per_page') ?? '50');

    let filtered = mockCustomers;
    if (search) {
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(search) || c.customer_code.toLowerCase().includes(search)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (buFilter) {
      filtered = filtered.filter((c) => c.business_unit === buFilter);
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const data = filtered.slice(start, start + perPage);

    return HttpResponse.json<PaginatedResponse<Customer360Row>>({
      message: 'Success',
      data,
      meta: { page, per_page: perPage, total },
    });
  }),

  // GET /customers/:id/360 — detail
  http.get(`${BASE_URL}/customers/:id/360`, ({ params }) => {
    const id = parseInt(params.id as string);
    if (id === 1) {
      return HttpResponse.json({ message: 'Success', data: mockCustomerDetail });
    }
    const found = mockCustomers.find((c) => c.id === id);
    if (!found) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Customer tidak ditemukan' }, { status: 404 });
    }
    // return minimal detail for other customers
    return HttpResponse.json({
      message: 'Success',
      data: {
        ...found,
        categories_bought: [],
        monthly_revenue_trend: [],
        recent_invoices: [],
      },
    });
  }),
];
