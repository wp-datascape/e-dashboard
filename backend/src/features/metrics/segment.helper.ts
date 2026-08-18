/**
 * Re-export dari customers/helper/segment.helper — SSOT segmentasi customer.
 */
export type { SegmentParams } from '@/features/customers/helper/segment.helper'

export {
  buildSegmentParams,
  sqlStatusExpr,
  sqlStatusWhere,
  cteEstablishedCustomers,
  monthEndDate,
  divisionToDormantKey,
} from '@/features/customers/helper/segment.helper'
