import { db } from './src/db/index.ts'
import { customers, invoices, channel_divisions } from './src/db/schema/index.ts'
import { sql, desc, isNull, eq } from 'drizzle-orm'

try {
  const latestSq = db
    .selectDistinctOn([invoices.customer_id], {
      customer_id: invoices.customer_id,
      channel_name: invoices.channel_name,
    })
    .from(invoices)
    .where(isNull(invoices.deleted_at))
    .orderBy(invoices.customer_id, desc(invoices.invoice_date))
    .as('latest_sp')

  const r = await db
    .select({ id: customers.id, channel_name: latestSq.channel_name, division: channel_divisions.division })
    .from(customers)
    .leftJoin(latestSq, eq(latestSq.customer_id, customers.id))
    .leftJoin(channel_divisions, eq(channel_divisions.channel_name, latestSq.channel_name))
    .limit(3)
  console.log('OK:', JSON.stringify(r))
} catch(e: any) {
  console.error('Error:', e.message)
  console.error('Cause:', e.cause?.message || JSON.stringify(e.cause))
}
process.exit(0)
