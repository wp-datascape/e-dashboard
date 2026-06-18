// frontend/src/types/customers.ts

export type BusinessUnit = 'b2b_dc' | 'b2b_project' | 'b2c' | 'manufacturing' | null;
export type CustomerStatus = 'active' | 'dormant' | 'new';

export interface Customer360Row {
  id: number;
  customer_code: string;
  name: string;
  company: { id: number; name: string };
  business_unit: BusinessUnit;
  status: CustomerStatus;
  first_invoice_date: string | null;
  last_invoice_date: string | null;
  category_count: number;
  avg_monthly_revenue: number;
  lifetime_value: number;
  total_invoices: number;
}

export interface Customer360Detail {
  id: number;
  customer_code: string;
  name: string;
  company: { id: number; name: string };
  business_unit: BusinessUnit;
  status: CustomerStatus;
  first_invoice_date: string | null;
  last_invoice_date: string | null;
  lifetime_value: number;
  avg_monthly_revenue: number;
  category_count: number;
  categories_bought: string[];
  monthly_revenue_trend: Array<{ month: string; revenue: number; gp: number }>;
  recent_invoices: Array<{
    invoice_number: string;
    invoice_date: string;
    total_revenue: number;
    total_gp: number;
  }>;
}

export interface Customer360Params {
  company_id?: number | 'all';
  business_unit?: BusinessUnit;
  status?: CustomerStatus;
  search?: string;
  sort_by?: 'avg_monthly_revenue' | 'lifetime_value' | 'category_count' | 'last_invoice_date';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
