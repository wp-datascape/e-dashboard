// frontend/src/types/customers.ts

// Division sekarang dinamis per company (task012 v2, FK-based) — field ini
// membawa LABEL display (mis. "Distribution"), bukan key/union literal tetap lagi.
export type Division = string | null;
export type CustomerStatus = 'active' | 'dormant' | 'new' | 'existing';

export interface CustomerRow {
  id: number;
  customer_code: string;
  name: string;
  company: { id: number; name: string };
  business_unit: string | null;
  division: Division;
  status: CustomerStatus;
  first_invoice_date: string | null;
  last_invoice_date: string | null;
  category_count: number;
  avg_monthly_revenue: number;
  lifetime_value: number;
  total_invoices: number;
}

export interface CustomerDetail {
  id: number;
  customer_code: string;
  name: string;
  company: { id: number; name: string };
  business_unit: string | null;
  division: Division;
  channel: string | null;
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

export interface CustomerParams {
  company_id?: number | 'all';
  branch_id?: number;
  // Division sekarang FK integer per company (task012 v2) — division_id, bukan
  // string key lagi.
  business_unit?: number;
  status?: CustomerStatus;
  search?: string;
  sort_by?: 'avg_monthly_revenue' | 'lifetime_value' | 'category_count' | 'last_invoice_date';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  as_of_date?: string;
  exclude_intercompany?: boolean;
}

// ─── Backward-compat aliases (hapus saat semua referensi sudah diupdate) ──────
/** @deprecated gunakan CustomerRow */
export type Customer360Row = CustomerRow;
/** @deprecated gunakan CustomerDetail */
export type Customer360Detail = CustomerDetail;
/** @deprecated gunakan CustomerParams */
export type Customer360Params = CustomerParams;
/** @deprecated gunakan Division */
export type BusinessUnit = Division;
