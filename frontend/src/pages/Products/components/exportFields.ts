// exportFields.ts (2026-08-31, instruksi user: "expor produk belum ada
// fitur pilih field seperti transaksi") — daftar field yang bisa dipilih di
// dialog export Excel Produk. DIPISAH dari ExportFieldsDialog.tsx (bukan
// komponen) krn eslint react-refresh/only-export-components, pola sama
// persis Transactions/components/exportFields.ts.
//
// Urutan+key HARUS sinkron dgn allow-list backend
// (metrics.schema.ts EXPORT_PRODUCT_FIELDS) — key yg beda cuma diam-diam
// diabaikan backend (allow-list), bukan error nyasar.
export interface ExportFieldDef {
  key: string;
  labelKey: string;
}

export const EXPORT_FIELDS: ExportFieldDef[] = [
  { key: 'product_name', labelKey: 'products.productName' },
  { key: 'category_name', labelKey: 'products.categoryName' },
  { key: 'is_high_margin', labelKey: 'products.highMarginBadge' },
  { key: 'total_revenue', labelKey: 'products.totalRevenue' },
  { key: 'total_gp', labelKey: 'products.totalGP' },
  { key: 'gp_margin_ratio', labelKey: 'products.gpMargin' },
  { key: 'customer_count', labelKey: 'products.customerCount' },
  { key: 'invoice_count', labelKey: 'products.invoiceCount' },
  { key: 'last_sold_month', labelKey: 'products.lastSoldMonth' },
];

export const ALL_EXPORT_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);
