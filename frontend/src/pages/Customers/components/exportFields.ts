// exportFields.ts (2026-08-31, instruksi user: "periksa juga untuk export
// customer" — susulan fitur pilih field export Products) — daftar field
// yang bisa dipilih di dialog export Excel Customer. DIPISAH dari
// ExportFieldsDialog.tsx (bukan komponen) krn eslint
// react-refresh/only-export-components, pola sama persis
// Transactions/components/exportFields.ts.
//
// Urutan+key HARUS sinkron dgn allow-list backend
// (customers.schema.ts EXPORT_CUSTOMER_FIELDS) — key yg beda cuma diam-diam
// diabaikan backend (allow-list), bukan error nyasar.
export interface ExportFieldDef {
  key: string;
  labelKey: string;
}

export const EXPORT_FIELDS: ExportFieldDef[] = [
  { key: 'customer_code', labelKey: 'customers.code' },
  { key: 'name', labelKey: 'customers.name' },
  { key: 'company_name', labelKey: 'customers.detail.company' },
  { key: 'division_label', labelKey: 'customers.detail.division' },
  { key: 'status_label', labelKey: 'customers.status' },
  { key: 'category_count', labelKey: 'customers.categories' },
  { key: 'avg_monthly_revenue', labelKey: 'customers.detail.avgMonthly' },
  { key: 'lifetime_value', labelKey: 'customers.detail.lifetimeValue' },
  { key: 'last_invoice_date', labelKey: 'customers.lastTransaction' },
  { key: 'total_invoices', labelKey: 'customers.totalInvoices' },
];

export const ALL_EXPORT_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);
