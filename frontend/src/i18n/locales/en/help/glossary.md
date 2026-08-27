These terms appear on the summary cards and drilldown tables of nearly every KPI, explained once here and referenced under each KPI below.

## 6 Base Statuses

Every customer who has ever transacted falls into exactly one of these statuses in a given period (except Relapsed, which is an extra marker on a subset of Dormant).

- **Acquisition**: A customer making their very first transaction in the current period.
- **Active Customer**: A customer who transacted in the previous period and transacts again in the current period.
- **Reactivated**: A customer who did not transact in the previous period but transacts again in the current period (and is not a first-time Acquisition).
- **Lapsed**: A customer who has transacted before, has no transaction this period, but has not yet crossed the dormant threshold for their business category.
- **Dormant**: A customer who has transacted before and has crossed the dormant threshold. Considered stopped or at risk of being lost.
- **Relapsed**: A customer who came back active after being dormant (Reactivated), but has fallen dormant again this period. This is an extra marker, not a standalone 6th status.

## 4 Combined Metrics

These numbers are used as the denominator population on the summary cards of various KPIs, each built from a combination of the statuses above.

| Term | Definition | Formula |
| --- | --- | --- |
| **Active Transacting** | All customers who transacted in the current period, including first-time customers. | `Acquisition + Active Customer + Reactivated` |
| **Existing Active** | Customers who have transacted before (not first-time) and are still actively transacting in the current period. | `Active Customer + Reactivated` |
| **Customer Base (Addressable)** | Customers who have transacted before and have not yet crossed the dormant threshold, still reachable or actionable. | `Active Customer + Reactivated + Lapsed` |
| **Total Customer Base** | All customers who have ever transacted, regardless of current status, including those already dormant. | `Active Customer + Reactivated + Lapsed + Dormant` |

## Population Used by Each KPI

| KPI | Denominator Population |
| --- | --- |
| M1, M2 | Active Transacting |
| M3, M4, M5, M6 | Existing Active |
| M7 | Customer Base (Addressable) |
| M8, M9, M10 | Total Customer Base |
