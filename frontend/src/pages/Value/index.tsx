import { KpiGroupPage } from '@/components/dashboard/KpiGroupPage'

// Value (task029.md §2, §16-19): M3 Average Revenue/Existing Customer,
// M4 Average Gross Profit/Existing Customer, M5 High Margin Product
// Penetration.
export default function Value() {
  return (
    <KpiGroupPage
      titleKey="nav.groups.value"
      metricKeys={['avg_revenue', 'avg_gross_profit', 'high_margin_penetration']}
    />
  )
}
