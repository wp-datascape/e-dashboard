import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

export interface AvgCategoryRepoParams {
  cid: number          // 0 = semua company
  companyScopeIds?: number[]
  periodEnd: string    // YYYY-MM-DD = akhir bulan dari period_month
  activeWindow: number // jumlah bulan window aktif (rolling)
  division?: string | null   // filter laporan (mirror business_unit di metrics lain)
  excludeIntercompany?: boolean
  branchFilter?: number | null // filter laporan (mirror branch_id di metrics lain)
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, string[]>
}

export interface AvgCategoryTrendRow {
  month: string
  avg_category: number
}

// Rolling avg jumlah kategori produk berbeda per customer aktif, per titik bulan (12 bulan terakhir).
// Pola sama dengan fetchCrossSellingTrend (m1.repository.ts).
export async function fetchAvgCategoryTrend(p: AvgCategoryRepoParams): Promise<AvgCategoryTrendRow[]> {
  const branchCond = buildBranchConditionRaw('i.company_id', 'i.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('i.branch_id', 'cd.division', p.divisionScope)
  const companyCondI = buildCompanyConditionRaw('i.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('cd.division', p.excludeIntercompany)
  const division = p.division ?? null
  const branchFilter = p.branchFilter ?? null

  const rawRows = await db.execute(sql`
    WITH
    months AS (
      SELECT
        TO_CHAR(m, 'YYYY-MM') AS label,
        (date_trunc('month', m) + INTERVAL '1 month' - INTERVAL '1 day')::date AS me
      FROM generate_series(
        date_trunc('month', ${p.periodEnd}::date - INTERVAL '11 months'),
        date_trunc('month', ${p.periodEnd}::date),
        INTERVAL '1 month'
      ) AS m
    ),
    base AS (
      SELECT
        i.customer_id,
        i.invoice_date,
        ii.product_category_id
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND c.is_placeholder = false
        AND i.invoice_date >  ${p.periodEnd}::date - INTERVAL '12 months'
        AND i.invoice_date <= ${p.periodEnd}::date
        AND ${companyCondI}
        AND ii.product_category_id IS NOT NULL
        AND (${division}::text IS NULL OR cd.division = ${division}::text)
        AND (${branchFilter}::int IS NULL OR i.branch_id = ${branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
    ),
    monthly AS (
      SELECT
        m.label,
        b.customer_id,
        COUNT(DISTINCT b.product_category_id) AS cat_count
      FROM months m
      JOIN base b ON b.invoice_date > m.me - ${p.activeWindow}::int * INTERVAL '1 month'
                 AND b.invoice_date <= m.me
      GROUP BY m.label, b.customer_id
    ),
    -- Agregasi per bulan sebelum LEFT JOIN ke months agar bulan tanpa transaksi tetap muncul (nilai 0)
    agg AS (
      SELECT
        label,
        ROUND(AVG(cat_count)::numeric, 2) AS avg_category
      FROM monthly
      GROUP BY label
    )
    SELECT
      m.label                       AS month,
      COALESCE(a.avg_category, 0)   AS avg_category
    FROM months m
    LEFT JOIN agg a ON a.label = m.label
    ORDER BY m.label
  `)

  return (rawRows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      month:        String(row.month),
      avg_category: Number(row.avg_category ?? 0),
    }
  })
}
