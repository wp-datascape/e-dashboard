import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

/**
 * Drill-down "Customer Pembeli" + "Capaian per Divisi" (task017) — fitur baru
 * total, belum ada endpoint serupa sebelumnya (yang ada sebelumnya kebalikannya:
 * dari 1 customer, produk apa saja yang dia beli — lihat customer-products.
 * repository.ts). Dipakai dialog drill-down di ProductsHighMargin (baik dari
 * baris kategori maupun produk).
 *
 * GROUP BY customer_id + division_id (BUKAN cuma customer_id) — divisi properti
 * TRANSAKSI, bukan properti tetap customer (mirror produk, lihat hmCatsCte). 1
 * customer BISA muncul >1 baris kalau beli lewat >1 divisi berbeda utk produk/
 * kategori yang sama.
 */
export interface HmCustomerRepoParams {
  cid: number
  companyScopeIds?: number[]
  targetType: 'category' | 'product'
  targetId: number
  periodEnd: string
  activeWindow: number
  page: number
  perPage: number
  division?: number | null   // filter laporan - mirror division di high-margin-penetration.repository.ts
  branchFilter?: number | null
  excludeIntercompany?: boolean
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, number[]>
  otherIdByBranch?: Map<number, number>
  intercompanyIdByCompany?: Map<number, number>
}

export interface HmCustomerDbRow {
  customer_id: number
  customer_code: string | null
  customer_name: string
  division_id: number | null
  division_label: string | null
  total_revenue: number
  total_gp: number
  invoice_count: number
  last_invoice_date: string
  total_count: number
}

export interface HmDivisionBreakdownDbRow {
  division_id: number | null
  division_label: string | null
  total_revenue: number
  total_gp: number
  customer_count: number
}

// items CTE dipakai 2 query terpisah (customer list terpaginasi + breakdown per
// divisi TIDAK terpaginasi) — mirror pola categoryProductsCte (rows+summary di
// category-products.repository.ts): summary/breakdown WAJIB query sendiri, bukan
// scalar/window function nempel di baris per-customer, supaya tetap benar walau
// halaman customer yang diminta kosong.
function hmCustomerItemsCte(p: HmCustomerRepoParams) {
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('i.company_id', 'COALESCE(c.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null
  const targetCond = p.targetType === 'product'
    ? sql`ii.product_id = ${p.targetId}::int`
    : sql`ii.product_category_id = ${p.targetId}::int`

  return sql`
    WITH items AS (
      SELECT
        i.customer_id,
        c.customer_code,
        c.customer_name,
        COALESCE(c.division_override_id, cd.division_id) AS division_id,
        d.label                                            AS division_label,
        i.id                                                AS invoice_id,
        i.invoice_date,
        ii.revenue::numeric                                 AS revenue,
        ii.gross_profit::numeric                            AS gp
      FROM invoice_items ii
      JOIN invoices  i ON i.id = ii.invoice_id
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN divisions d ON d.id = COALESCE(c.division_override_id, cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other'))
      WHERE i.deleted_at    IS NULL
        AND c.is_placeholder = false
        AND ${companyCondI}
        AND i.invoice_date >  ${p.periodEnd}::date - ${p.activeWindow}::int * INTERVAL '1 month'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND ${targetCond}
        AND (${division}::int IS NULL OR COALESCE(c.division_override_id, cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    )
  `
}

export async function fetchHmCustomers(p: HmCustomerRepoParams): Promise<HmCustomerDbRow[]> {
  const offset = (p.page - 1) * p.perPage
  const cte = hmCustomerItemsCte(p)

  const rows = await db.execute(sql`
    ${cte}
    SELECT
      customer_id,
      MAX(customer_code)                     AS customer_code,
      MAX(customer_name)                     AS customer_name,
      division_id,
      MAX(division_label)                    AS division_label,
      SUM(revenue)::bigint                   AS total_revenue,
      SUM(gp)::bigint                        AS total_gp,
      COUNT(DISTINCT invoice_id)::int        AS invoice_count,
      MAX(invoice_date)::text                AS last_invoice_date,
      COUNT(*) OVER ()::int                  AS total_count
    FROM items
    GROUP BY customer_id, division_id
    ORDER BY total_revenue DESC
    LIMIT  ${p.perPage}
    OFFSET ${offset}
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      customer_id:       Number(row.customer_id),
      customer_code:     row.customer_code ? String(row.customer_code) : null,
      customer_name:     String(row.customer_name),
      division_id:       row.division_id != null ? Number(row.division_id) : null,
      division_label:    row.division_label ? String(row.division_label) : null,
      total_revenue:     Number(row.total_revenue ?? 0),
      total_gp:          Number(row.total_gp ?? 0),
      invoice_count:     Number(row.invoice_count ?? 0),
      last_invoice_date: String(row.last_invoice_date ?? ''),
      total_count:       Number(row.total_count ?? 0),
    }
  })
}

/** "Capaian per Divisi" — breakdown TIDAK terpaginasi (beda dari fetchHmCustomers
 * yang terpaginasi), dipakai bareng di dialog drill-down yang sama (task017 §3c).
 * "Lainnya" (division_id/division_label null) — transaksi yang channel-nya tidak
 * match rule apa pun di channel_divisions, TIDAK dihilangkan (transparansi total,
 * biar breakdown selalu jumlahnya sama dgn Ringkasan grand total). */
export async function fetchHmDivisionBreakdown(p: HmCustomerRepoParams): Promise<HmDivisionBreakdownDbRow[]> {
  const cte = hmCustomerItemsCte(p)
  const rows = await db.execute(sql`
    ${cte}
    SELECT
      division_id,
      MAX(division_label)                    AS division_label,
      SUM(revenue)::bigint                    AS total_revenue,
      SUM(gp)::bigint                          AS total_gp,
      COUNT(DISTINCT customer_id)::int        AS customer_count
    FROM items
    GROUP BY division_id
    ORDER BY total_revenue DESC
  `)
  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      division_id:    row.division_id != null ? Number(row.division_id) : null,
      division_label: row.division_label ? String(row.division_label) : null,
      total_revenue:  Number(row.total_revenue ?? 0),
      total_gp:       Number(row.total_gp ?? 0),
      customer_count: Number(row.customer_count ?? 0),
    }
  })
}
