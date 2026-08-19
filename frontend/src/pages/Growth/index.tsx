import { KpiGroupPage } from '@/components/dashboard/KpiGroupPage'

// Growth (task029.md §2, §8-10): M1 Cross Selling, M2 Average Product
// Category, M7 Customer Expansion Rate.
export default function Growth() {
  return (
    <KpiGroupPage
      titleKey="nav.groups.growth"
      metricKeys={['cross_selling_ratio', 'avg_category', 'expansion_rate']}
    />
  )
}
