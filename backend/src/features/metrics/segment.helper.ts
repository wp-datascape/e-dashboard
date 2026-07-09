/**
 * Re-export dari customers/helper/segment.helper — SSOT segmentasi customer.
 */
export type { SegmentParams, CustomerSegmentCount } from '@/features/customers/helper/segment.helper'

export {
  buildSegmentParams,
  getCustomerSegments,
  getActiveCount,
  getExistingCount,
  sqlStatusExpr,
  sqlStatusWhere,
  cteEstablishedCustomers,
  cteNewCustomers,
  cteActiveCustomers,
  cteExistingCustomers,
  cteDormantCustomers,
  monthEndDate,

  // Backward-compat aliases untuk metrics.repository.ts yang sudah ada
  cteEstablishedCustomers as sqlExistingCustomers,
  cteDormantCustomers     as sqlDormantCustomers,
} from '@/features/customers/helper/segment.helper'
