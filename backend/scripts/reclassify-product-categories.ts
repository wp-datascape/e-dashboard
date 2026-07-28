/**
 * scripts/reclassify-product-categories.ts
 *
 * Task010 addendum (2026-07-29) — product_categories.item_type sebelumnya cuma
 * di-set SEKALI saat kategori pertama dibuat (bug di upsertProductCategory,
 * sudah difix — lihat import.repository.ts + docs-v2/features/import.md
 * §Implementation Notes). Fix itu forward-only (cuma berlaku begitu ada
 * invoice baru masuk untuk kategori itu). Script ini backfill RETROAKTIF
 * untuk kategori yang item_type-nya sudah kadung salah SEKARANG — re-evaluasi
 * tiap kategori pakai classifyItemType() (Classification Rules yang aktif
 * saat script ini dijalankan), sama persis logic yang dipakai import.
 *
 * unitPrice pakai AVG(invoice_items.unit_price) dari semua item kategori itu
 * (representatif untuk rule price_range) — field yang sama yang dipakai alur
 * import asli SETELAH fix unitPrice (import.service.ts, sebelumnya salah
 * pakai row.revenue = Total Harga, BUKAN harga per unit — lihat fix di file
 * itu). Kategori tanpa invoice sama sekali (tidak pernah ada transaksi) pakai
 * unitPrice=0.
 *
 * Default: DRY RUN, laporan kategori mana yang bakal berubah (dari → ke).
 * Pakai --apply untuk benar-benar menjalankan UPDATE.
 *
 * Usage:
 *   bun run backend/scripts/reclassify-product-categories.ts            # audit saja
 *   bun run backend/scripts/reclassify-product-categories.ts --apply    # backfill beneran
 */

import { db } from '@/config/db'
import { product_categories } from '@/db/schema'
import { classifyItemType } from '@/utils/classifier'
import { sql, eq } from 'drizzle-orm'

const APPLY = process.argv.includes('--apply')

interface CategoryRow {
  id: number
  company_id: number
  name: string
  current_item_type: string
  avg_unit_price: string
}

async function main() {
  console.log(APPLY
    ? '=== RECLASSIFY product_categories.item_type (APPLY) ==='
    : '=== AUDIT product_categories.item_type (DRY RUN) ===')

  const rows = await db.execute(sql`
    SELECT
      pc.id,
      pc.company_id,
      pc.name,
      pc.item_type                          AS current_item_type,
      COALESCE(AVG(ii.unit_price), 0)::numeric AS avg_unit_price
    FROM product_categories pc
    LEFT JOIN products p       ON p.product_category_id = pc.id
    LEFT JOIN invoice_items ii ON ii.product_id = p.id
    GROUP BY pc.id, pc.company_id, pc.name, pc.item_type
    ORDER BY pc.company_id, pc.name
  `)
  const categories = rows as unknown as CategoryRow[]

  const changes: { id: number; company_id: number; name: string; from: string; to: string; matchedRule?: string }[] = []

  for (const cat of categories) {
    const result = await classifyItemType({
      itemName: cat.name,
      categoryName: cat.name,
      unitPrice: Number(cat.avg_unit_price),
      companyId: cat.company_id,
    })
    if (result.itemType !== cat.current_item_type) {
      changes.push({
        id: cat.id,
        company_id: cat.company_id,
        name: cat.name,
        from: cat.current_item_type,
        to: result.itemType,
        matchedRule: result.matchedRule,
      })
    }
  }

  console.log(`\nTotal kategori dicek: ${categories.length}`)
  console.log(`Kategori yang bakal berubah: ${changes.length}`)
  if (changes.length > 0) {
    console.table(changes)
  }

  if (APPLY && changes.length > 0) {
    for (const c of changes) {
      await db.update(product_categories)
        .set({ item_type: c.to, updated_at: new Date() })
        .where(eq(product_categories.id, c.id))
    }
    console.log(`\nSelesai — ${changes.length} kategori di-update.`)
  } else if (!APPLY) {
    console.log('\nDry run selesai — tidak ada perubahan data. Jalankan ulang dengan --apply untuk benar-benar backfill.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
