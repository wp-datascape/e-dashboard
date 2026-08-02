import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, roles, userRoles, invoices, channel_divisions, customers } from '@/db/schema'
import type { UserPreferences } from '@/db/schema/schema-auth'
import { findConfigByKey } from '@/features/config/config.repository'
import {
  getUserCompanyIds,
  getUserBranchScopes,
  getUserDivisionScopes,
} from '@/features/auth/auth.repository'

const ENFORCEMENT_CONFIG_KEY = 'branch_division_enforcement_enabled'

/**
 * Sama persis logic `isEnforcementEnabled()` di `middleware/auth.ts` — TIDAK
 * diexport dari sana (private ke module itu), jadi diduplikasi kecil di sini.
 * Scheduler jalan di luar request context, tidak bisa reuse ctx.var.user.
 */
async function isEnforcementEnabled(): Promise<boolean> {
  const config = await findConfigByKey(ENFORCEMENT_CONFIG_KEY)
  return config?.value === 'true'
}

export interface CustomerScope {
  company_id: number
  branch_id: number | null
  division_id: number | null
}

/**
 * Resolve branch_id + division_id efektif customer dari invoice TERBARU —
 * pola sama persis dgn `customers.repository.ts` (latestSalespersonSq) dan
 * exclude-intercompany di `analisis.repository.ts` (COALESCE
 * division_override_id, channel_divisions.division_id).
 */
export async function resolveCustomerScope(customerId: number, companyId: number): Promise<CustomerScope> {
  const [row] = await db
    .select({
      branch_id: invoices.branch_id,
      division_id: sql<number | null>`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id})`,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customer_id))
    .leftJoin(
      channel_divisions,
      and(eq(channel_divisions.channel_name, invoices.channel_name), eq(channel_divisions.company_id, invoices.company_id)),
    )
    .where(and(eq(invoices.customer_id, customerId), isNull(invoices.deleted_at)))
    .orderBy(sql`${invoices.invoice_date} DESC`)
    .limit(1)

  return {
    company_id: companyId,
    branch_id: row?.branch_id ?? null,
    division_id: row?.division_id ?? null,
  }
}

export interface AlertRecipient {
  id: number
  notification_email: string | null
  // Dipakai resolve bahasa notifikasi in-app (task016 §32) — locale ikut
  // recipient masing-masing, BUKAN admin yang setup Resend/jalankan scheduler.
  preferences: UserPreferences
}

/**
 * Resolve penerima alert utk 1 customer — role admin/superadmin yang punya
 * akses ke scope customer itu (company, +branch+division kalau enforcement
 * aktif). Arahnya KEBALIK dari resolveCompanyScope/resolveBranchScope
 * (middleware/auth.ts, yang jalan per-request buat 1 user) — di sini dari 1
 * customer, cari SEMUA user yang cocok (task016 §6/§14). Superadmin selalu
 * ikut, bypass semua scope check (konsisten dgn resolveCompanyScope).
 */
export async function resolveAlertRecipients(scope: CustomerScope): Promise<AlertRecipient[]> {
  const candidates = await db
    .select({
      id: users.id,
      notification_email: users.notification_email,
      preferences: users.preferences,
      is_superadmin: sql<boolean>`bool_or(${roles.name} = 'superadmin')`,
    })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.user_id, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.role_id))
    .where(
      and(
        inArray(roles.name, ['admin', 'superadmin']),
        eq(users.is_active, true),
        isNull(users.deleted_at),
      ),
    )
    .groupBy(users.id)

  if (candidates.length === 0) return []

  const enforcementEnabled = await isEnforcementEnabled()

  const result: AlertRecipient[] = []
  for (const candidate of candidates) {
    if (candidate.is_superadmin) {
      result.push({ id: candidate.id, notification_email: candidate.notification_email, preferences: candidate.preferences })
      continue
    }

    const companyIds = await getUserCompanyIds(candidate.id)
    if (!companyIds.includes(scope.company_id)) continue

    if (enforcementEnabled && scope.branch_id !== null) {
      const branchScopes = await getUserBranchScopes(candidate.id)
      const hasBranch = branchScopes.some(b => b.company_id === scope.company_id && b.branch_id === scope.branch_id)
      if (!hasBranch) continue

      if (scope.division_id !== null) {
        const divisionScopes = await getUserDivisionScopes(candidate.id)
        const hasDivision = divisionScopes.some(d => d.branch_id === scope.branch_id && d.division_id === scope.division_id)
        if (!hasDivision) continue
      }
    }

    result.push({ id: candidate.id, notification_email: candidate.notification_email, preferences: candidate.preferences })
  }

  return result
}
