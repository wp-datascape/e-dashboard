import { KpiGroupPage } from '@/components/dashboard/KpiGroupPage'

// Retention (task029.md §2, §11-15): M6 Repeat Order Rate, M8 Dormant
// Customer Rate, M9 Dormant Customer Value, M10 Customer Reactivation Rate.
export default function Retention() {
  return (
    <KpiGroupPage
      titleKey="nav.groups.retention"
      metricKeys={['repeat_order_rate', 'dormant_rate', 'dormant_value', 'reactivation_rate']}
    />
  )
}
