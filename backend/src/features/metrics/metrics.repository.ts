export type { TrendRow } from './repository/m3m7.repository'

export { fetchCustomerMetricsTrend, fetchRevenueBreakdown, fetchExpansionBreakdown } from './repository/m3m7.repository'
export { fetchGpBreakdown }           from './repository/m4.repository'
export { fetchHmBreakdown }           from './repository/m5.repository'
export { fetchRorBreakdown }          from './repository/m6.repository'
export { fetchDormantTrend, fetchDormantValueRanking } from './repository/m8m10.repository'
export {
  fetchCrossSellingKPI,
  fetchCrossSellingTrend,
  fetchCrossSellingDetail,
  fetchCrossSellingHeatmap,
} from './repository/m1.repository'
export { fetchCategoryPerformance } from './repository/category-performance.repository'
export type { CategoryPerformanceDbRow } from './repository/category-performance.repository'
export { fetchCategoryProducts } from './repository/category-products.repository'
export type { CategoryProductDbRow } from './repository/category-products.repository'
export { fetchHmDetail, fetchUpsellTargets } from './repository/high-margin-penetration.repository'
export type { HmDetailDbRow, UpsellTargetDbRow, CategoryRef } from './repository/high-margin-penetration.repository'
export { fetchCustomerProducts } from './repository/customer-products.repository'
export type { CustomerProductDbRow } from './repository/customer-products.repository'
export { fetchAvgCategoryTrend } from './repository/avg-category.repository'
export type { AvgCategoryTrendRow } from './repository/avg-category.repository'
