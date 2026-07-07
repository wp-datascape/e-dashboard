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

export type ItemType = 'unit' | 'consumable' | 'sparepart' | 'service'

export interface ClassificationResult {
  itemType: ItemType
  needsReview: boolean
  matchedRule?: string
}

type DbRule = typeof item_classification_rules.$inferSelect

// ─── DB Lookup ───────────────────────────────────────────────────────────────

async function lookupFromDb(
  itemName: string,
  categoryName: string,
  unitPrice: number,
  companyId: number,
): Promise<DbRule | null> {
  try {
    const rules = await db
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
  } catch (err) {
    logger.error(`Classifier DB lookup failed: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

// ─── Main Classifier ─────────────────────────────────────────────────────────

export interface ClassifyOptions {
  itemName: string
  categoryName: string
  unitPrice: number
  companyId: number
}

export async function classifyItemType(options: ClassifyOptions): Promise<ClassificationResult> {
  const { itemName, categoryName, unitPrice, companyId } = options

  const dbRule = await lookupFromDb(itemName, categoryName, unitPrice, companyId)
  if (dbRule) {
    return {
      itemType: dbRule.item_type as ItemType,
      needsReview: false,
      matchedRule: `db_rule:${dbRule.match_type}:${dbRule.match_pattern}`,
    }
  }

  return { itemType: 'unit', needsReview: true, matchedRule: 'fallback:unit' }
}
