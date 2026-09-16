/**
 * Re-export dari customers/helper/segment.helper — SSOT segmentasi customer.
 */
export type { SegmentParams, InvoiceScopeConditions, InvoiceScopeParams } from '@/features/customers/helper/segment.helper'

export {
  buildSegmentParams,
  cteEstablishedCustomers,
  cteFirstInvoiceDate,
  cteExistingCustomersByPeriod,
  cteCustDivision,
  dormantThresholdCaseSql,
  dormantCrossedSql,
  resolveInvoiceScopeConditions,
  monthEndDate,
  divisionToDormantKey,
  isScopeEffectivelyUnrestricted,
} from '@/features/customers/helper/segment.helper'
