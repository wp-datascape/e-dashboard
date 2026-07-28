// frontend/src/api/products.api.ts
import { api } from './axios'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  CategoryPerformanceRow,
  CategoryPerformanceParams,
  ProductPerformanceRow,
  ProductPerformanceParams,
  ProductCategoryOption,
  CategoryProductRow,
  CategoryProductsParams,
  HighMarginCategoryRow,
  HighMarginDetailParams,
  UpsellTargetRow,
  UpsellTargetParams,
  CustomerProductRow,
  CustomerProductsParams,
  ProductTrendData,
  ProductTrendParams,
} from '@/types/products'

export const productsApi = {
  // 3.1 — Category Performance Ledger
  getCategoryPerformance: async (
    params: CategoryPerformanceParams
  ): Promise<PaginatedResponse<CategoryPerformanceRow>> => {
    const res = await api.get<PaginatedResponse<CategoryPerformanceRow>>(
      '/metrics/category-performance',
      { params }
    )
    return res.data
  },

  // 3.1c — Product Performance (flat list produk)
  getProductPerformance: async (
    params: ProductPerformanceParams
  ): Promise<PaginatedResponse<ProductPerformanceRow>> => {
    const res = await api.get<PaginatedResponse<ProductPerformanceRow>>(
      '/metrics/product-performance',
      { params }
    )
    return res.data
  },

  // 3.1c — Opsi dropdown filter kategori di halaman flat list produk
  getProductCategoryOptions: async (
    params: { company_id: number | 'all' }
  ): Promise<ProductCategoryOption[]> => {
    const res = await api.get<ApiResponse<ProductCategoryOption[]>>(
      '/metrics/product-categories',
      { params }
    )
    return res.data.data
  },

  // 3.1b — Products in a category (drawer)
  getCategoryProducts: async (
    params: CategoryProductsParams
  ): Promise<PaginatedResponse<CategoryProductRow>> => {
    const res = await api.get<PaginatedResponse<CategoryProductRow>>(
      '/metrics/category-products',
      { params }
    )
    return res.data
  },

  // 3.2 — High Margin detail per kategori
  getHighMarginDetail: async (
    params: HighMarginDetailParams
  ): Promise<PaginatedResponse<HighMarginCategoryRow>> => {
    const res = await api.get<PaginatedResponse<HighMarginCategoryRow>>(
      '/metrics/high-margin-penetration/detail',
      { params }
    )
    return res.data
  },

  // 3.2 — Upsell targets (customer yang belum beli high margin)
  getUpsellTargets: async (
    params: UpsellTargetParams
  ): Promise<PaginatedResponse<UpsellTargetRow>> => {
    const res = await api.get<PaginatedResponse<UpsellTargetRow>>(
      '/metrics/high-margin-penetration/customers',
      { params }
    )
    return res.data
  },

  // customer purchase history
  getCustomerProducts: async (
    params: CustomerProductsParams
  ): Promise<PaginatedResponse<CustomerProductRow>> => {
    const res = await api.get<PaginatedResponse<CustomerProductRow>>(
      '/metrics/customer-products',
      { params }
    )
    return res.data
  },

  // 3.3 — Product Trend (reuse M2 avg-category endpoint)
  getProductTrend: async (params: ProductTrendParams): Promise<ProductTrendData> => {
    const res = await api.get<ApiResponse<ProductTrendData>>('/metrics/avg-category', { params })
    return res.data.data
  },
}