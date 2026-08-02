// frontend/src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products.api'
import type {
  CategoryPerformanceParams,
  ProductPerformanceParams,
  CategoryProductsParams,
  HighMarginDetailParams,
  UpsellTargetParams,
  CustomerProductsParams,
  ProductTrendParams,
  HmCustomersParams,
} from '@/types/products'

export const PRODUCTS_KEYS = {
  customerProducts: (params: CustomerProductsParams) =>
    ['products', 'customer-products', params] as const,
  categoryPerformance: (params: CategoryPerformanceParams) =>
    ['products', 'category-performance', params] as const,
  productPerformance: (params: ProductPerformanceParams) =>
    ['products', 'product-performance', params] as const,
  categoryProducts: (params: CategoryProductsParams) =>
    ['products', 'category-products', params] as const,
  highMarginDetail: (params: HighMarginDetailParams) =>
    ['products', 'high-margin-detail', params] as const,
  highMarginProductDetail: (params: HighMarginDetailParams) =>
    ['products', 'high-margin-product-detail', params] as const,
  hmCustomers: (params: HmCustomersParams) =>
    ['products', 'hm-customers', params] as const,
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

export function useProductPerformance(params: ProductPerformanceParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.productPerformance(params),
    queryFn: () => productsApi.getProductPerformance(params),
  })
}

export function useProductCategoryOptions(companyId: number | 'all', itemType?: string) {
  return useQuery({
    queryKey: ['products', 'product-category-options', companyId, itemType],
    queryFn: () => productsApi.getProductCategoryOptions({ company_id: companyId, item_type: itemType }),
  })
}

export function useCategoryProducts(params: CategoryProductsParams | null) {
  return useQuery({
    queryKey: params ? PRODUCTS_KEYS.categoryProducts(params) : ['products', 'category-products', null],
    queryFn: () => productsApi.getCategoryProducts(params!),
    enabled: !!params,
  })
}

export function useHighMarginDetail(params: HighMarginDetailParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.highMarginDetail(params),
    queryFn: () => productsApi.getHighMarginDetail(params),
  })
}

export function useHighMarginProductDetail(params: HighMarginDetailParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.highMarginProductDetail(params),
    queryFn: () => productsApi.getHighMarginProductDetail(params),
  })
}

export function useHmCustomers(params: HmCustomersParams | null) {
  return useQuery({
    queryKey: params ? PRODUCTS_KEYS.hmCustomers(params) : ['products', 'hm-customers', null],
    queryFn: () => productsApi.getHmCustomers(params!),
    enabled: !!params,
  })
}

export function useUpsellTargets(params: UpsellTargetParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.upsellTargets(params),
    queryFn: () => productsApi.getUpsellTargets(params),
  })
}

export function useCustomerProducts(params: CustomerProductsParams | null) {
  return useQuery({
    queryKey: params ? PRODUCTS_KEYS.customerProducts(params) : ['products', 'customer-products', null],
    queryFn: () => productsApi.getCustomerProducts(params!),
    enabled: !!params,
  })
}

export function useProductTrend(params: ProductTrendParams) {
  return useQuery({
    queryKey: PRODUCTS_KEYS.productTrend(params),
    queryFn: () => productsApi.getProductTrend(params),
  })
}