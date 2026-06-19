// frontend/src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products.api'
import type {
  CategoryPerformanceParams,
  HighMarginDetailParams,
  UpsellTargetParams,
  ProductTrendParams,
} from '@/types/products'

export const PRODUCTS_KEYS = {
  categoryPerformance: (params: CategoryPerformanceParams) =>
    ['products', 'category-performance', params] as const,
  highMarginDetail: (params: HighMarginDetailParams) =>
    ['products', 'high-margin-detail', params] as const,
  upsellTargets: (params: UpsellTargetParams) =>
    ['products', 'upsell-targets', params] as const,
  productTrend: (params: ProductTrendParams) =>
    ['products', 'trend', params] as const,
}

export function useCategoryPerformance(params: CategoryPerformanceParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.categoryPerformance(params),
    queryFn: () => productsApi.getCategoryPerformance(params),
  })
}

export function useHighMarginDetail(params: HighMarginDetailParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.highMarginDetail(params),
    queryFn: () => productsApi.getHighMarginDetail(params),
  })
}

export function useUpsellTargets(params: UpsellTargetParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.upsellTargets(params),
    queryFn: () => productsApi.getUpsellTargets(params),
  })
}

export function useProductTrend(params: ProductTrendParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.productTrend(params),
    queryFn: () => productsApi.getProductTrend(params),
  })
}