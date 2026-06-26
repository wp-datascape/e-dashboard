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
    business_unit: 'distribution',
    division: 'distribution',
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
    business_unit: 'distribution',
    division: 'distribution',
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
    business_unit: 'e_commerce',
    division: 'e_commerce',
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
    business_unit: 'distribution',
    division: 'distribution',
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
    business_unit: 'project',
    division: 'project',
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
    division: null,
    status: 'active',
    first_invoice_date: '2022-08-20',
    last_invoice_date: '2024-01-10',
    category_count: 2,
    avg_monthly_revenue: 6000000,
    lifetime_value: 102000000,
    total_invoices: 17,
  },
];

const mockCustomerDetails: Record<number, Customer360Detail> = {
  1: {
    id: 1,
    customer_code: 'CUST-001',
    name: 'PT Maju Bersama',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'distribution',
    division: 'distribution',
    channel: 'DC WEST',
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
  },
  2: {
    id: 2,
    customer_code: 'CUST-002',
    name: 'CV Teknologi Nusantara',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'distribution',
    division: 'distribution',
    channel: 'DC EAST',
    status: 'active',
    first_invoice_date: '2021-06-10',
    last_invoice_date: '2024-01-15',
    lifetime_value: 289000000,
    avg_monthly_revenue: 8500000,
    category_count: 2,
    categories_bought: ['Printer', 'Toner'],
    monthly_revenue_trend: [
      { month: '2023-02', revenue: 7000000, gp: 2100000 },
      { month: '2023-03', revenue: 8000000, gp: 2400000 },
      { month: '2023-04', revenue: 7500000, gp: 2250000 },
      { month: '2023-05', revenue: 9000000, gp: 2700000 },
      { month: '2023-06', revenue: 8500000, gp: 2550000 },
      { month: '2023-07', revenue: 9500000, gp: 2850000 },
      { month: '2023-08', revenue: 8000000, gp: 2400000 },
      { month: '2023-09', revenue: 10000000, gp: 3000000 },
      { month: '2023-10', revenue: 9000000, gp: 2700000 },
      { month: '2023-11', revenue: 8500000, gp: 2550000 },
      { month: '2023-12', revenue: 9500000, gp: 2850000 },
      { month: '2024-01', revenue: 8000000, gp: 2400000 },
    ],
    recent_invoices: [
      { invoice_number: 'INV-2024-010', invoice_date: '2024-01-15', total_revenue: 8000000, total_gp: 2400000 },
      { invoice_number: 'INV-2023-095', invoice_date: '2023-12-10', total_revenue: 9500000, total_gp: 2850000 },
    ],
  },
  3: {
    id: 3,
    customer_code: 'CUST-003',
    name: 'PT Solusi Digital',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'e_commerce',
    division: 'e_commerce',
    channel: 'TOKOPEDIA',
    status: 'dormant',
    first_invoice_date: '2021-01-05',
    last_invoice_date: '2023-09-12',
    lifetime_value: 108800000,
    avg_monthly_revenue: 3200000,
    category_count: 1,
    categories_bought: ['Ribbon'],
    monthly_revenue_trend: [
      { month: '2023-02', revenue: 3500000, gp: 1050000 },
      { month: '2023-03', revenue: 2800000, gp: 840000 },
      { month: '2023-04', revenue: 3200000, gp: 960000 },
      { month: '2023-05', revenue: 3600000, gp: 1080000 },
      { month: '2023-06', revenue: 3100000, gp: 930000 },
      { month: '2023-07', revenue: 2900000, gp: 870000 },
      { month: '2023-08', revenue: 3400000, gp: 1020000 },
      { month: '2023-09', revenue: 3000000, gp: 900000 },
    ],
    recent_invoices: [
      { invoice_number: 'INV-2023-070', invoice_date: '2023-09-12', total_revenue: 3000000, total_gp: 900000 },
      { invoice_number: 'INV-2023-058', invoice_date: '2023-08-05', total_revenue: 3400000, total_gp: 1020000 },
    ],
  },
  4: {
    id: 4,
    customer_code: 'CUST-004',
    name: 'PT Industri Mandiri',
    company: { id: 2, name: 'PT XYZ Mandiri' },
    business_unit: 'distribution',
    division: 'distribution',
    channel: 'DC EAST HEAD',
    status: 'active',
    first_invoice_date: '2023-01-20',
    last_invoice_date: '2024-01-18',
    lifetime_value: 264000000,
    avg_monthly_revenue: 22000000,
    category_count: 4,
    categories_bought: ['Scanner', 'Printer', 'Toner', 'Ribbon'],
    monthly_revenue_trend: [
      { month: '2023-02', revenue: 20000000, gp: 6000000 },
      { month: '2023-03', revenue: 22000000, gp: 6600000 },
      { month: '2023-04', revenue: 21000000, gp: 6300000 },
      { month: '2023-05', revenue: 23000000, gp: 6900000 },
      { month: '2023-06', revenue: 20000000, gp: 6000000 },
      { month: '2023-07', revenue: 24000000, gp: 7200000 },
      { month: '2023-08', revenue: 22000000, gp: 6600000 },
      { month: '2023-09', revenue: 25000000, gp: 7500000 },
      { month: '2023-10', revenue: 23000000, gp: 6900000 },
      { month: '2023-11', revenue: 26000000, gp: 7800000 },
      { month: '2023-12', revenue: 24000000, gp: 7200000 },
      { month: '2024-01', revenue: 22000000, gp: 6600000 },
    ],
    recent_invoices: [
      { invoice_number: 'INV-2024-005', invoice_date: '2024-01-18', total_revenue: 22000000, total_gp: 6600000 },
      { invoice_number: 'INV-2023-092', invoice_date: '2023-12-20', total_revenue: 24000000, total_gp: 7200000 },
      { invoice_number: 'INV-2023-081', invoice_date: '2023-11-15', total_revenue: 26000000, total_gp: 7800000 },
    ],
  },
  5: {
    id: 5,
    customer_code: 'CUST-005',
    name: 'PT Proyek Infrastruktur',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: 'project',
    division: 'project',
    channel: 'SDR B2B WEST',
    status: 'new',
    first_invoice_date: '2024-01-05',
    last_invoice_date: '2024-01-05',
    lifetime_value: 45000000,
    avg_monthly_revenue: 45000000,
    category_count: 2,
    categories_bought: ['Scanner', 'Printer'],
    monthly_revenue_trend: [
      { month: '2024-01', revenue: 45000000, gp: 13500000 },
    ],
    recent_invoices: [
      { invoice_number: 'INV-2024-002', invoice_date: '2024-01-05', total_revenue: 45000000, total_gp: 13500000 },
    ],
  },
  6: {
    id: 6,
    customer_code: 'CUST-006',
    name: 'CV Mitra Usaha',
    company: { id: 1, name: 'PT ABC Sejahtera' },
    business_unit: null,
    division: null,
    channel: null,
    status: 'active',
    first_invoice_date: '2022-08-20',
    last_invoice_date: '2024-01-10',
    lifetime_value: 102000000,
    avg_monthly_revenue: 6000000,
    category_count: 2,
    categories_bought: ['Toner', 'Ribbon'],
    monthly_revenue_trend: [
      { month: '2023-02', revenue: 5000000, gp: 1500000 },
      { month: '2023-03', revenue: 6000000, gp: 1800000 },
      { month: '2023-04', revenue: 5500000, gp: 1650000 },
      { month: '2023-05', revenue: 7000000, gp: 2100000 },
      { month: '2023-06', revenue: 6500000, gp: 1950000 },
      { month: '2023-07', revenue: 6000000, gp: 1800000 },
      { month: '2023-08', revenue: 7000000, gp: 2100000 },
      { month: '2023-09', revenue: 6500000, gp: 1950000 },
      { month: '2023-10', revenue: 5500000, gp: 1650000 },
      { month: '2023-11', revenue: 6000000, gp: 1800000 },
      { month: '2023-12', revenue: 7500000, gp: 2250000 },
      { month: '2024-01', revenue: 6000000, gp: 1800000 },
    ],
    recent_invoices: [
      { invoice_number: 'INV-2024-008', invoice_date: '2024-01-10', total_revenue: 6000000, total_gp: 1800000 },
      { invoice_number: 'INV-2023-091', invoice_date: '2023-12-05', total_revenue: 7500000, total_gp: 2250000 },
    ],
  },
};

export const customersHandlers = [
  // GET /customers/360 — list
  http.get(`${BASE_URL}/customers/360`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const statusFilter = url.searchParams.get('status');
    const divisionFilter = url.searchParams.get('business_unit');
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
    if (divisionFilter) {
      filtered = filtered.filter((c) => c.division === divisionFilter);
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
    const detail = mockCustomerDetails[id];
    if (detail) {
      return HttpResponse.json({ message: 'Success', data: detail });
    }
    return HttpResponse.json({ error: 'NOT_FOUND', message: 'Customer tidak ditemukan' }, { status: 404 });
  }),
];
