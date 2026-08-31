// exportFields.ts (2026-08-30) — daftar field yang bisa dipilih di dialog
// export Excel Transaksi. DIPISAH dari ExportFieldsDialog.tsx (bukan
// komponen) krn eslint react-refresh/only-export-components — file
// komponen cuma boleh export komponen, konstanta/fungsi dipisah file
// sendiri spy fast-refresh tidak rusak.
//
// Urutan+key HARUS sinkron dgn `EXPORT_INVOICE_FIELDS`/kolom Excel di
// backend (transactions.schema.ts/transactions.handler.ts) — key yg beda
// cuma diam-diam diabaikan backend (allow-list), bukan error nyasar.
export interface ExportFieldDef {
  key: string;
  labelKey: string;
  /** Kalau diisi, checkbox field ini nonaktif kecuali SEMUA key di sini
   * juga tercentang — lihat JSDoc ExportFieldsDialog.tsx. */
  dependsOn?: string[];
}

export const EXPORT_FIELDS: ExportFieldDef[] = [
  { key: 'invoice_number', labelKey: 'transactions.invoiceNumber' },
  { key: 'invoice_date', labelKey: 'transactions.invoiceDate' },
  { key: 'company_name', labelKey: 'customers.detail.company' },
  { key: 'customer_name', labelKey: 'customers.name' },
  { key: 'customer_code', labelKey: 'transactions.customerCode' },
  { key: 'business_unit', labelKey: 'customers.detail.businessUnit' },
  { key: 'total_revenue', labelKey: 'transactions.totalRevenue' },
  { key: 'total_gp', labelKey: 'transactions.totalGP' },
  { key: 'gp_margin_ratio', labelKey: 'transactions.gpMargin', dependsOn: ['total_revenue', 'total_gp'] },
  { key: 'category_count', labelKey: 'transactions.categoryCount' },
  { key: 'import_source', labelKey: 'transactions.importSource' },
];

export const ALL_EXPORT_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);
