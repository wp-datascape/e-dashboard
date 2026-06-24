/**
 * utils/classifier.ts
 *
 * Item Classification Engine — 4 Layer untuk mengklasifikasi item type
 * dari data Accurate Online.
 *
 * Flow:
 *   Layer 1: Keyword matching (nama item → nama kategori)
 *   Layer 2: Price range heuristic
 *   Layer 3: DB lookup table override
 *   Layer 4: Fallback ke 'unit' + needs_review
 *
 * Semua teks dinormalisasi ke UPPERCASE sebelum diproses.
 *
 * Layer 1 & 2 bersifat stateless (tidak perlu DB query).
 * Layer 3 membutuhkan DB query ke tabel `item_classification_rules`.
 */
import { and, eq } from 'drizzle-orm'
import { db } from '@/config/db'
import { item_classification_rules } from '@/db/schema/item_classification_rules'
import { logger } from '@/utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ItemType = 'unit' | 'consumable' | 'sparepart' | 'service'

export interface ClassificationResult {
  itemType: ItemType
  needsReview: boolean
  matchedRule?: string
}

type DbRule = typeof item_classification_rules.$inferSelect

// ─── Default Keywords (Layer 1 — Hardcoded) ──────────────────────────────────

interface KeywordEntry {
  keyword: string
  itemType: ItemType
}

const DEFAULT_KEYWORD_RULES: KeywordEntry[] = [
  { keyword: 'CARTRIDGE', itemType: 'consumable' },
  { keyword: 'INK ', itemType: 'consumable' },
  { keyword: 'RIBBON', itemType: 'consumable' },
  { keyword: 'TONER', itemType: 'consumable' },
  { keyword: 'PAPER', itemType: 'consumable' },
  { keyword: 'LABEL', itemType: 'consumable' },
  { keyword: 'STICKER', itemType: 'consumable' },
  { keyword: 'THERMAL PAPER', itemType: 'consumable' },
  { keyword: 'PART ', itemType: 'sparepart' },
  { keyword: 'CABLE', itemType: 'sparepart' },
  { keyword: 'ADAPTOR', itemType: 'sparepart' },
  { keyword: 'POWER SUPPLY', itemType: 'sparepart' },
  { keyword: 'PRINTER', itemType: 'unit' },
  { keyword: 'SCANNER', itemType: 'unit' },
  { keyword: 'MONEY COUNTER', itemType: 'unit' },
  { keyword: 'DISPLAY', itemType: 'unit' },
  { keyword: 'MONITOR', itemType: 'unit' },
  { keyword: 'SERVICE', itemType: 'service' },
  { keyword: 'INSTALASI', itemType: 'service' },
  { keyword: 'MAINTENANCE', itemType: 'service' },
  { keyword: 'JASA', itemType: 'service' },
  { keyword: 'LABOR', itemType: 'service' },
]

// ─── Price Thresholds (Layer 2) ──────────────────────────────────────────────

function classifyByPrice(unitPrice: number): ItemType | null {
  if (unitPrice >= 500000) return 'unit'
  if (unitPrice >= 50000) return 'consumable'
  if (unitPrice > 0) return 'sparepart'
  return null
}

// ─── Layer 1: Keyword Classification ─────────────────────────────────────────

function matchKeyword(text: string): KeywordEntry | null {
  const upper = text.toUpperCase()
  // Sort by keyword length descending (more specific first)
  const sorted = [...DEFAULT_KEYWORD_RULES].sort((a, b) => b.keyword.length - a.keyword.length)
  for (const entry of sorted) {
    if (upper.includes(entry.keyword)) return entry
  }
  return null
}

// ─── Layer 3: DB Lookup ──────────────────────────────────────────────────────

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
      .where(and(eq(item_classification_rules.is_active, true)))
      .orderBy(item_classification_rules.priority)

    if (rules.length === 0) return null

    const upperItem = itemName.toUpperCase()
    const upperCategory = categoryName.toUpperCase()
    let bestMatch: DbRule | null = null

    for (const rule of rules) {
      if (rule.company_id !== null && rule.company_id !== companyId) continue

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

  // Layer 1: Keyword di Nama Item
  const itemMatch = matchKeyword(itemName)
  if (itemMatch) {
    return { itemType: itemMatch.itemType, needsReview: false, matchedRule: `keyword_item_name:${itemMatch.keyword}` }
  }

  // Layer 1: Keyword di Nama Kategori
  const catMatch = matchKeyword(categoryName)
  if (catMatch) {
    return { itemType: catMatch.itemType, needsReview: false, matchedRule: `keyword_category:${catMatch.keyword}` }
  }

  // Layer 2: Price Range
  if (unitPrice > 0) {
    const priceType = classifyByPrice(unitPrice)
    if (priceType) {
      return { itemType: priceType, needsReview: true, matchedRule: `price_range:${unitPrice}` }
    }
  }

  // Layer 3: DB Lookup
  const dbRule = await lookupFromDb(itemName, categoryName, unitPrice, companyId)
  if (dbRule) {
    return {
      itemType: dbRule.item_type as ItemType,
      needsReview: false,
      matchedRule: `db_rule:${dbRule.match_type}:${dbRule.match_pattern}`,
    }
  }

  // Layer 4: Fallback
  return { itemType: 'unit', needsReview: true, matchedRule: 'fallback:unit' }
}

/**
 * Synchronous classification (Layer 1+2 only) — no DB call.
 */
export function classifyItemTypeSync(
  itemName: string,
  categoryName: string,
  unitPrice: number,
): { itemType: ItemType; needsReview: boolean } {
  const itemMatch = matchKeyword(itemName)
  if (itemMatch) return { itemType: itemMatch.itemType, needsReview: false }

  const catMatch = matchKeyword(categoryName)
  if (catMatch) return { itemType: catMatch.itemType, needsReview: false }

  if (unitPrice > 0) {
    const priceType = classifyByPrice(unitPrice)
    if (priceType) return { itemType: priceType, needsReview: true }
  }

  return { itemType: 'unit', needsReview: true }
}