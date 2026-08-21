/**
 * utils/classifier.ts
 *
 * Item Classification Engine — full DB-driven.
 * Rules dikonfigurasi via import template CSV di halaman Settings → Classification.
 *
 * Flow:
 *   1. DB lookup dari item_classification_rules (company-specific dulu, lalu global)
 *   2. Fallback ke 'unit' + needsReview = true jika tidak ada rule yang match
 */
import { and, eq, or, isNull, desc } from 'drizzle-orm'
import { db } from '@/config/db'
import { item_classification_rules } from '@/db/schema'
import { logger } from '@/utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

// string, bukan union literal - item_type dinamis per company (task011), tidak
// lagi 4 nilai tetap. Fallback masih 'unit' (lihat classifyItemType di bawah).
export type ItemType = string

export interface ClassificationResult {
  itemType: ItemType
  needsReview: boolean
  matchedRule?: string
}

export type DbRule = typeof item_classification_rules.$inferSelect

// ─── Rules loader ────────────────────────────────────────────────────────────

/**
 * Ambil semua rule aktif utk 1 company (company-specific + global) — SEKALI per
 * batch/import, bukan per baris. Rule-nya identik untuk SEMUA baris company yang
 * sama dalam 1 file (tidak berubah di tengah proses import), jadi caller (mis.
 * import.service.ts) WAJIB panggil ini SEKALI di luar loop lalu reuse hasilnya
 * ke semua baris — ditemukan 2026-08-21 lewat audit N+1: sebelumnya query ini
 * (JOIN + ORDER BY) diulang di SETIAP baris item (bisa puluhan ribu per file),
 * padahal hasilnya selalu sama.
 */
export async function loadClassificationRules(companyId: number): Promise<DbRule[]> {
  try {
    return await db
      .select()
      .from(item_classification_rules)
      .where(
        and(
          eq(item_classification_rules.is_active, true),
          or(
            eq(item_classification_rules.company_id, companyId),
            isNull(item_classification_rules.company_id),
          ),
        ),
      )
      .orderBy(desc(item_classification_rules.priority))
  } catch (err) {
    logger.error(`Classifier DB lookup failed: ${err instanceof Error ? err.message : String(err)}`)
    return []
  }
}

// ─── Matching (murni in-memory, TIDAK ada DB call) ────────────────────────────

function matchRules(rules: DbRule[], itemName: string, categoryName: string, unitPrice: number): DbRule | null {
  if (rules.length === 0) return null

  const upperItem = itemName.toUpperCase()
  const upperCategory = categoryName.toUpperCase()
  let bestMatch: DbRule | null = null

  for (const rule of rules) {
    const pattern = rule.match_pattern.toUpperCase()
    let matched = false

    switch (rule.match_type) {
      case 'keyword_item_name':
        matched = upperItem.includes(pattern)
        break
      case 'keyword_category':
        matched = upperCategory.includes(pattern)
        break
      case 'exact_item_name':
        matched = upperItem === pattern
        break
      case 'exact_category':
        matched = upperCategory === pattern
        break
      case 'price_range': {
        try {
          const range = JSON.parse(rule.match_pattern) as { min?: number; max?: number }
          if (range.min !== undefined && unitPrice < range.min) break
          if (range.max !== undefined && unitPrice > range.max) break
          matched = true
        } catch {
          // skip invalid JSON
        }
        break
      }
    }

    if (matched) {
      if (!bestMatch || rule.priority > bestMatch.priority) {
        bestMatch = rule
      }
    }
  }

  return bestMatch
}

// ─── Main Classifier ─────────────────────────────────────────────────────────

export interface ClassifyOptions {
  itemName: string
  categoryName: string
  unitPrice: number
  /** Hasil `loadClassificationRules(companyId)` — SEKALI per batch, lihat docstring-nya. */
  rules: DbRule[]
}

export function classifyItemType(options: ClassifyOptions): ClassificationResult {
  const { itemName, categoryName, unitPrice, rules } = options

  const dbRule = matchRules(rules, itemName, categoryName, unitPrice)
  if (dbRule) {
    return {
      itemType: dbRule.item_type as ItemType,
      needsReview: false,
      matchedRule: `db_rule:${dbRule.match_type}:${dbRule.match_pattern}`,
    }
  }

  return { itemType: 'unit', needsReview: true, matchedRule: 'fallback:unit' }
}
