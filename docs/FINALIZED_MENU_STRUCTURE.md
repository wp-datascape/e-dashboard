# FINALIZED MENU STRUCTURE — Executive Dashboard

**Decision Date**: 2026-06-17  
**Status**: FINALIZED

---

## Executive Summary

Based on user requirements, the menu structure has been finalized with **Executive Dashboard as Group 1 (Makro/Primary)** since it represents the core business need. The other workbenches serve as supporting/drill-down views (Mikro).

---

## Final Menu Structure

### GROUP 1: EXECUTIVE DASHBOARD (Makro — Primary/Core)
**Purpose**: Strategic overview with 10 KPIs — the main dashboard

- **1.1 Overview Dashboard** — 10 MetricCard + charts (✅ Already built)

### GROUP 2: CUSTOMER WORKBENCH (Mikro — Who)
**Purpose**: Customer segmentation, expansion opportunities, churn prevention

- **2.1 Customer 360 & Segmentation** — Master customer table with BU filter (☐ New)
- **2.2 Expansion & Upsell Targets** — M3 Revenue + M4 GP analysis (✅ Partial — from CustomerMetrics)
- **2.3 Churn Risk & Dormant** — M8 Dormant Rate + M9 Value + M10 Reactivation (✅ Built — DormantCustomer page)
- **2.4 Cross-sell Opportunity Matrix** — M1 Ratio + M1.1 Heatmap (✅ Built — CrossSelling page)

### GROUP 3: PRODUCT & PORTFOLIO WORKBENCH (Mikro — What)
**Purpose**: Product performance, margin analysis, inventory health

- **3.1 Product Performance Ledger** — Product master table with sales velocity (☐ New)
- **3.2 High Margin Push List** — M5 High Margin Penetration drill-down (✅ Partial — from CustomerMetrics)
- **3.3 Product Trend & Velocity** — M2 Avg Category per Customer trend (✅ Reusable — from CrossSelling)
- **3.4 Dormant Product / Dead Stock** — Low-velocity products (☐ New)

### GROUP 4: TRANSACTION & REVENUE WORKBENCH (Mikro — Event)
**Purpose**: Transaction ledger, project tracking, loyalty analysis

- **4.1 B2B DC & B2C Order Ledger** — Invoice transaction table (☐ New)
- **4.2 B2B Project Milestone Ledger** — Project-based contracts tracking (☐ New — **High Complexity**)
- **4.3 Repeat Order & Loyalty Tracker** — M6 Repeat Order Rate drill-down (✅ Reusable — from CustomerMetrics)

### GROUP 5: ADMIN (System)
**Purpose**: System administration and configuration

- **5.1 Import** — Upload CSV/Excel or fetch from Accurate API (☐ Placeholder)
- **5.2 Users** — User management (☐ Placeholder)
- **5.3 RBAC** — Role & permission management (☐ Placeholder)
- **5.4 Config** — System configuration (☐ Placeholder)
- **5.5 Audit Log** — Audit trail viewer (☐ Placeholder)

---

## Status Legend

- ✅ **Built** — Fully implemented
- ✅ **Reusable** — Chart/component exists, can be reused
- ✅ **Partial** — Some components exist, needs reorganization
- ☐ **New** — Needs to be built from scratch
- ☐ **Placeholder** — Page exists but empty

---

## Implementation Impact Analysis

### What STAYS (Can be Reused)

| Component | Status |
|-----------|--------|
| Tech stack (React, MUI, Recharts, Hono, Bun, PostgreSQL) | ✅ No change |
| 9 chart components (Area, Bar, Heatmap, Combo, Donut, etc.) | ✅ 100% reusable |
| 10 metric calculations + cache logic (backend) | ✅ Reusable (not built yet) |
| Auth, RBAC, Import modules (backend) | ✅ Design stays same |
| Current Dashboard page (M1-M10) | ✅ Becomes Group 1.1 |

### What CHANGES (Medium Impact)

| Area | Change | Effort |
|------|--------|--------|
| **Menu & Routing** | Flat 9 menus → 5 groups with sub-menus | 🟢 Easy (2-4 hours) |
| **Page Reorganization** | Split/combine existing pages into new structure | 🟡 Medium (2-3 days) |
| **Data Model** | Add business_unit, products table, projects table | 🔴 Critical (see below) |

### Critical Backend Changes Needed

The current data model is **insufficient** for the finalized architecture:

| Requirement | Current Schema | Action Needed |
|-------------|----------------|---------------|
| `business_unit` field in customers/companies | ❌ Missing | Add field (B2B DC, B2B Project, B2C, Manufacturing) |
| Product master table with margin, SKU, qty_sold | ❌ Missing | Create `products` table |
| Projects/contracts table (for B2B Project BU) | ❌ Missing | Create `projects` table |
| "Recommended Next Product" logic | ❌ Missing | Build recommendation engine |
| `customer.lifetime_value`, `customer.avg_monthly_revenue` | ❌ Missing | Add computed fields |

---

## Recommended Implementation Sequence

### NOW (Documentation Phase)
1. ✅ Update `menu.tsx` with finalized structure (Already done)
2. ☐ Update `DATA_MODEL.md` — add business_unit, products, projects tables
3. ☐ Update `API_SPEC.md` — add BU filter to all endpoints

### PHASE 1: Executive Dashboard (Group 1) — 1 week
**Priority**: Highest — Already 75% complete
- Add business_unit toggle filter to Dashboard page
- Enhance with drill-down links to workbenches
- **Deliverable**: Fully functional executive dashboard with BU filtering

### PHASE 2: Customer Workbench (Group 2) — 2-3 weeks
**Priority**: High — Strategic for sales team
- Build Customer 360 table (2.1)
- Reorganize existing CustomerMetrics into Expansion (2.2)
- Keep Dormant page as Churn Risk (2.3) — already done
- Keep CrossSelling page as Matrix (2.4) — already done
- **Backend**: Need customer 360 endpoint + BU filter

### PHASE 3: Product Workbench (Group 3) — 2-3 weeks
**Priority**: Medium
- Build Product Performance Ledger (3.1) — requires products table
- Extract High Margin from CustomerMetrics (3.2)
- Reuse M2 chart for Product Trend (3.3)
- Build Dead Stock detection (3.4)
- **Backend**: Need products master table + velocity calculations

### PHASE 4: Transaction Workbench (Group 4) — 3-4 weeks
**Priority**: Medium-Low
- Build Order Ledger (4.1) — BU-aware invoice queries
- Build Project Milestone tracker (4.2) — **Complex: new entity**
- Reuse M6 chart for Loyalty (4.3)
- **Backend**: Need projects table + milestone tracking

### PHASE 5: Admin (Group 5) — 1-2 weeks
**Priority**: Medium — Needed for operations
- Build Import UI (5.1)
- Build Users management (5.2)
- Build RBAC management (5.3)
- Build Config UI (5.4)
- Build Audit Log viewer (5.5)

---

## Key Decision: B2B Project Milestone

Menu **4.2 (B2B Project Milestone Ledger)** introduces significant complexity:
- Requires new `projects` table with milestone tracking
- Different business logic from regular invoices
- Specific to B2B Project business unit only

**Recommendation**: Evaluate if this should be:
- ✅ **In MVP** — If B2B Project is a critical revenue stream
- ☐ **Deferred to v2** — If complexity outweighs immediate business value

---

## Architecture Benefits

### Why This Structure is Better

1. **Entity-Driven vs Metric-Driven**
   - Old: Flat menu of metrics
   - New: Organized by business entities (Customer, Product, Transaction)
   - Better UX: Users think in terms of "Who buys? What sells? When?" not "Show me M3"

2. **Makro-Mikro Separation**
   - Group 1 = Strategic overview (executives)
   - Groups 2-4 = Operational drill-downs (managers, sales)
   - Clear information hierarchy

3. **Business Unit Awareness**
   - All workbenches filter by BU (B2B DC, B2B Project, B2C, Mfg)
   - Enables holding-level + entity-level views
   - Sales team sees only their BU data (via RBAC)

4. **Scalable**
   - Easy to add new sub-menus within groups
   - Chart components 100% reusable across pages
   - Backend metrics already modular

---

## Migration from Current State

### Current Pages → New Structure Mapping

| Current Page | New Location | Notes |
|--------------|--------------|-------|
| Dashboard (M1-M10) | Group 1.1 Overview | Keep as-is, add BU filter |
| CrossSelling | Group 2.4 Cross-sell Matrix | Keep as-is |
| CustomerMetrics | Split into 2.2 (Expansion) + 3.2 (High Margin) | Reorganize into 2 pages |
| DormantCustomer | Group 2.3 Churn Risk | Keep as-is |
| Import | Group 5.1 Import | Build UI |
| Users | Group 5.2 Users | Build UI |
| RBAC | Group 5.3 RBAC | Build UI |
| Config | Group 5.4 Config | Build UI |
| AuditLog | Group 5.5 Audit Log | Build UI |

---

## Next Steps

1. **Immediate**: Update `DATA_MODEL.md` with business_unit + products + projects schema
2. **Week 1**: Implement Group 1 with BU filtering (quick win)
3. **Week 2-4**: Build Customer Workbench (highest business value)
4. **Decision Point**: Confirm if B2B Project Milestone is in MVP scope
5. **Month 2**: Product & Transaction workbenches
6. **Month 3**: Admin modules + polish

---

## Conclusion

This architecture represents **~40-50% new frontend work** but provides:
- Better UX (entity-driven navigation)
- Scalable structure (easy to extend)
- Business unit awareness (critical for multi-entity holding)
- Reusable components (9 charts + all existing logic)

**Key Success Factor**: Backend data model must support business_unit segmentation from day 1.

**Timing**: Since backend is still 0%, NOW is the perfect time to adopt this architecture before schema is committed.
