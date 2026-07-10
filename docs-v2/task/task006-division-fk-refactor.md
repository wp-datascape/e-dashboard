# Task 006: Division FK Refactoring — Solusi Akar Masalah

**Status**: Plan Complete (siap implementasi)  
**Date**: 2026-07-10  
**Owner**: @claude  
**Related**: MEMORY.md, task004.md, task005.md  

---

## Executive Summary

Refactor `divisions.code` dari varchar (string) menjadi `division_id` sebagai FK integer ke `branch_divisions.id`. Ini menyelesaikan 3 masalah struktural sekaligus tanpa meninggalkan utang teknis:

1. **Duplikasi kolom**: `channel_divisions.branch_id` redundan → hilang otomatis via FK relationship
2. **Integritas hanya di app code** → DB constraint yang menjamin
3. **Ambiguitas kode di ~32 lokasi JOIN** → FK menunjuk tepat 1 baris, JOIN via integer bukan string matching

**Effort**: 24 titik `scope.ts` + ~32 lokasi JOIN di 18 file + migration + seed = ~1 hari full refactor + testing

**Decision User**: Schema drop total boleh (dev/staging), production perlu migration aman. Per-company enforcement wajib (tidak boleh division_channels global lagi).

---

## Current State (Pre-Refactor)

### Schema Issues

**`division_channels` (sebelumnya channel_divisions):**
```sql
-- SEKARANG (BERMASALAH):
CREATE TABLE division_channels (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,           -- Per-company scope
  channel_name VARCHAR(255) NOT NULL,
  division VARCHAR(50) NOT NULL,     -- ← VARCHAR, bukan FK
  branch_id INT,                     -- ← DUPLIKASI (ada di branch_divisions juga)
  created_at TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (branch_id) REFERENCES company_branches(id)
);

-- MASALAH:
-- 1. division (varchar) bisa ambigu antar-branch
-- 2. branch_id duplikat → perlu disinkronkan manual
-- 3. Tidak ada DB constraint kalau division tidak valid
```

**`branch_divisions` (katalog divisi per branch):**
```sql
-- SUDAH BENAR (target FK):
CREATE TABLE branch_divisions (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  branch_id INT,                     -- NULL = company-wide, diisi = branch-specific
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,         -- ← String identifier (unik per company/branch)
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (company_id, branch_id, code),
  UNIQUE (company_id, code) WHERE branch_id IS NULL
);
```

### Code Issues (Scope Matching)

**`utils/scope.ts`** (24 titik string comparison):
```typescript
// SEKARANG — pakai COALESCE workaround:
export function buildDivisionConditionRaw(
  branchExpr: string,
  divisionCodeExpr: string,    // ← varchar, perlu COALESCE
  scopeMap: Map<number, string[]> | undefined  // ← string[]
): SQL {
  if (!scopeMap) return sql`true`
  const clauses = [...scopeMap.entries()].map(
    ([branchId, divisionCodes]) =>
      sql`(${sql.raw(branchExpr)} = ${branchId} AND 
           COALESCE(${sql.raw(divisionCodeExpr)}, 'other') IN (...))`  // ← workaround
  )
}
```

### JOIN Issues (~32 lokasi di 18 file)

Contoh dari `customers.repository.ts:54`:
```typescript
// SEKARANG — manual string join + coalesce:
LEFT JOIN division_channels dc ON 
  dc.channel_name = i.channel_name 
  AND dc.company_id = i.company_id
WHERE 
  COALESCE(bd.code, 'other') = ANY($1)  // ← string matching, ambiguitas
  AND bd.branch_id = i.branch_id         // ← tie-break manual
```

**Affected Files** (18 total):
- `src/utils/scope.ts` (4 functions: buildDivisionCondition, buildDivisionConditionRaw, resolveDivisionScope, scope-test)
- `src/features/customers/customers.repository.ts` (5 JOIN lokasi)
- `src/features/transactions/transactions.repository.ts` (4 JOIN lokasi)
- `src/features/metrics/repository/*` (9 file, ~15 JOIN lokasi)
- `src/features/dashboard/dashboard.repository.ts` (2 JOIN lokasi)
- `src/features/import/import.repository.ts` (2 JOIN lokasi)
- `src/features/settings/division-channels.*` (3 file: handler/service/schema update)

---

## Solution Architecture

### 1. Schema Changes

**Step A: Add FK Column (Drizzle Migration)**

```sql
-- 0012_add_division_id_fk.sql
ALTER TABLE division_channels ADD COLUMN division_id INT REFERENCES branch_divisions(id) ON DELETE CASCADE;
```

**Step B: Backfill division_id (SQL)**

```sql
-- Match channel_name → division via FK lookup
UPDATE division_channels dc
SET division_id = bd.id
FROM branch_divisions bd
WHERE bd.company_id = dc.company_id
  AND bd.branch_id IS NULL  -- company-wide divisi dulu
  AND dc.division = bd.code;

-- Kalau ada branch-specific division (future):
UPDATE division_channels dc
SET division_id = bd.id
FROM branch_divisions bd
WHERE bd.company_id = dc.company_id
  AND bd.branch_id = dc.branch_id
  AND dc.division = bd.code;

-- Pastikan semua berhasil di-backfill
SELECT COUNT(*) FROM division_channels WHERE division_id IS NULL;  -- harus 0
```

**Step C: Make division_id NOT NULL + Add Unique Constraint**

```sql
ALTER TABLE division_channels 
  ALTER COLUMN division_id SET NOT NULL,
  ADD UNIQUE (company_id, division_id),  -- 1 channel per division per company
  DROP COLUMN division,                  -- lama, redundan
  DROP COLUMN branch_id;                 -- redundan via FK → branch_divisions.branch_id
```

**Step D: Update Drizzle Schema**

`schema-product.ts`:
```typescript
export const division_channels = pgTable('division_channels', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id),
  division_id: integer('division_id').notNull().references(() => branch_divisions.id),
  channel_name: varchar('channel_name', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

---

### 2. Scope Layer Refactoring

**File**: `src/utils/scope.ts`

**Change 1: buildDivisionCondition signature**
```typescript
// SEBELUM:
export function buildDivisionCondition(
  branchCol: AnyColumn,
  divisionCodeCol: AnyColumn,      // ← varchar
  scopeMap: Map<number, string[]> | undefined  // ← string[]
): SQL | undefined

// SESUDAH:
export function buildDivisionCondition(
  branchCol: AnyColumn,
  divisionIdCol: AnyColumn,        // ← integer FK
  scopeMap: Map<number, number[]> | undefined  // ← number[]
): SQL | undefined {
  if (!scopeMap) return undefined
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(([branchId, divisionIds]) =>
    and(eq(branchCol, branchId), inArray(divisionIdCol, divisionIds))
  )
  return or(...clauses)
}
```

**Change 2: buildDivisionConditionRaw signature**
```typescript
// SEBELUM:
export function buildDivisionConditionRaw(
  branchExpr: string,
  divisionCodeExpr: string,
  scopeMap: Map<number, string[]> | undefined
): SQL {
  // COALESCE(${sql.raw(divisionCodeExpr)}, 'other') IN (...)

// SESUDAH:
export function buildDivisionConditionRaw(
  branchExpr: string,
  divisionIdExpr: string,          // ← integer, no COALESCE needed
  scopeMap: Map<number, number[]> | undefined
): SQL {
  if (!scopeMap) return sql`true`
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(
    ([branchId, divisionIds]) =>
      sql`(${sql.raw(branchExpr)} = ${branchId} AND ${sql.raw(divisionIdExpr)} IN (${sql.join(
        divisionIds.map((d) => sql`${d}`),
        sql`, `,
      )}))`
  )
  return sql.join(clauses, sql` OR `)
}
```

**Change 3: middleware/auth.ts — resolveDivisionScope**

Sudah benar di comment (2026-07-10), tapi confirm hasil adalah `Map<number, number[]>`:

```typescript
export function resolveDivisionScope(
  c: Context,
  branchScope: Map<number, number[]> | undefined
): Map<number, number[]> | undefined {
  // ← sudah return integer division_id, bukan string code
  const divisionScopes = c.var.user.divisionScopes as { branch_id: number; division_id: number }[]
  // ... logic tetap sama, cuma tipe berubah string → number
}
```

---

### 3. JOIN Refactoring (~32 lokasi)

**Pattern 1: Metrics Repository (raw SQL)**

**File**: `src/features/metrics/repository/m1.repository.ts`

```typescript
// SEBELUM:
const conditions = buildDivisionConditionRaw(
  'bd.branch_id',
  'COALESCE(bd.code, \'other\')',  // ← varchar workaround
  divisionScope
)

// SESUDAH (pakai FK):
const conditions = buildDivisionConditionRaw(
  'bd.branch_id',
  'bd.id',                         // ← integer FK, langsung
  divisionScope
)
```

**Pattern 2: Drizzle Repository (query builder)**

**File**: `src/features/customers/customers.repository.ts:54`

```typescript
// SEBELUM:
.leftJoin(division_channels, and(
  eq(division_channels.channel_name, invoices.channel_name),
  eq(division_channels.company_id, invoices.company_id)
))
.leftJoin(branch_divisions, eq(branch_divisions.id, division_channels.id))  // ← wrong!
// Lalu di WHERE: COALESCE(branch_divisions.code, 'other') = ANY($1)

// SESUDAH:
.leftJoin(division_channels, and(
  eq(division_channels.channel_name, invoices.channel_name),
  eq(division_channels.company_id, invoices.company_id)
))
.leftJoin(branch_divisions, eq(branch_divisions.id, division_channels.division_id))
// Lalu di WHERE: branch_divisions.id = ANY($1)  // ← FK match, not string
```

**Affected Files Summary** (18 total):

| File | JOIN Count | Notes |
|------|-----------|-------|
| `utils/scope.ts` | 4 | Function signatures + logic |
| `customers/customers.repository.ts` | 5 | findCustomers, findCustomerDetail JOIN |
| `transactions/transactions.repository.ts` | 4 | findInvoices, findInvoiceDetail |
| `metrics/repository/m1.repository.ts` | 2 | raw SQL JOIN |
| `metrics/repository/m3m7.repository.ts` | 2 | raw SQL |
| `metrics/repository/m4.repository.ts` | 1 | raw SQL |
| `metrics/repository/m5.repository.ts` | 1 | raw SQL |
| `metrics/repository/m6.repository.ts` | 1 | raw SQL |
| `metrics/repository/m8m10.repository.ts` | 2 | raw SQL |
| `metrics/repository/avg-category.repository.ts` | 1 | raw SQL |
| `metrics/repository/category-performance.repository.ts` | 1 | raw SQL |
| `metrics/repository/category-products.repository.ts` | 1 | raw SQL |
| `metrics/repository/customer-products.repository.ts` | 1 | raw SQL |
| `metrics/repository/high-margin-penetration.repository.ts` | 2 | raw SQL |
| `dashboard/dashboard.repository.ts` | 2 | raw SQL |
| `import/import.repository.ts` | 1 | upsertCustomer |
| `settings/division-channels.repository.ts` | 1 | schema update |
| `customers/helper/segment.helper.ts` | 1 | CTE definition |
| **TOTAL** | **32** | |

---

### 4. Seed & Data Update

**File**: `src/db/seed.ts`

```typescript
// SEBELUM:
const dc = await db.insert(division_channels).values({
  company_id: 1,
  channel_name: 'COUNTER',
  division: 'RETAIL',  // ← string
  branch_id: 1
}).returning()

// SESUDAH:
// Step 1: Cari division_id dari branch_divisions
const divisionRow = await db.query.branch_divisions.findFirst({
  where: and(
    eq(branch_divisions.company_id, 1),
    eq(branch_divisions.code, 'RETAIL'),
    or(
      isNull(branch_divisions.branch_id),      // company-wide
      eq(branch_divisions.branch_id, 1)        // branch-specific
    )
  )
})

// Step 2: Insert dengan division_id
const dc = await db.insert(division_channels).values({
  company_id: 1,
  channel_name: 'COUNTER',
  division_id: divisionRow!.id  // ← FK integer
}).returning()
```

---

### 5. RBAC & User Assignment (No Change)

**Files**: `src/features/auth/auth.repository.ts`, `middleware/auth.ts`

Schema & logic sudah benar (division_id integer), tidak perlu perubahan kode. Hanya perlu:
- `getUserDivisionScopes()` sudah return `{ branch_id: number; division_id: number }[]` ✓
- `resolveDivisionScope()` sudah map ke `Map<number, number[]>` ✓

---

## Implementation Plan (Step by Step)

### Phase 1: Schema + Backfill (30 min)

- [ ] **1.1** Create migration file `0012_add_division_id_fk.sql`
  - ADD division_id column
  - Backfill logic (match division.code → branch_divisions.id)
  - Validation query
  - Make NOT NULL
  - Drop kolom lama (division, branch_id)
  - Add unique constraint

- [ ] **1.2** Run migration locally
  - Verify backfill success (0 NULL rows)
  - Spot check 5-10 sample rows

### Phase 2: Scope Layer (45 min)

- [ ] **2.1** Update `utils/scope.ts`
  - Signature: `Map<number, string[]>` → `Map<number, number[]>`
  - Remove COALESCE workaround
  - Update 4 functions (buildDivisionCondition, buildDivisionConditionRaw, signatures)

- [ ] **2.2** Update `utils/scope.test.ts`
  - Update test data & assertions to use integer division_id
  - Verify scope building logic

### Phase 3: JOIN Refactoring (2 hours)

- [ ] **3.1** Metrics Repositories (9 files, raw SQL)
  - Update all `buildDivisionConditionRaw()` calls
  - Change division column reference from string to integer
  - Test query execution

- [ ] **3.2** Drizzle Repositories (6 files)
  - customers.repository.ts (5 JOIN)
  - transactions.repository.ts (4 JOIN)
  - import.repository.ts (1 JOIN)
  - dashboard.repository.ts (2 JOIN)
  - segment.helper.ts (1 CTE)

- [ ] **3.3** Settings/Division-Channels
  - schema.ts: update TypeScript types
  - service.ts: ensure division_id handling in create/update/import

### Phase 4: Seed & Data (30 min)

- [ ] **4.1** Update `db/seed.ts`
  - Refactor all `division_channels` inserts
  - Add lookup division_id from branch_divisions sebelum insert
  - Seed default divisions + channels

### Phase 5: Testing (1 hour)

- [ ] **5.1** Unit Tests
  - `utils/scope.test.ts` — scope building logic
  - Verify Map construction with integer division_id

- [ ] **5.2** E2E Tests
  - `test/scope-isolation.e2e.test.ts` — division enforcement
  - Sample query dari setiap repository (customer, metric, transaction)
  - Verify division_channels lookup works
  - Verify RBAC division filtering works

- [ ] **5.3** Manual Testing (Postman/API)
  - Login → check divisionScopes payload
  - Query metrics/customers/transactions dengan division filter
  - Verify enforcement sesuai resolveDivisionScope()

---

## Implementation Details by File

### Table: Files to Modify (18)

| # | File | Type | Changes |
|---|------|------|---------|
| 1 | `src/utils/scope.ts` | Core | 4 function sigs, remove COALESCE |
| 2 | `src/utils/scope.test.ts` | Test | Update test data (string→number) |
| 3 | `src/middleware/auth.ts` | Middleware | No code change (types already correct) |
| 4 | `src/db/schema/schema-product.ts` | Schema | Update division_channels table def |
| 5 | `src/db/seed.ts` | Data | Refactor division_channels seeding |
| 6 | `src/features/customers/customers.repository.ts` | Repository | 5 JOIN updates |
| 7 | `src/features/transactions/transactions.repository.ts` | Repository | 4 JOIN updates |
| 8 | `src/features/metrics/repository/m1.repository.ts` | Repository | 2 raw SQL updates |
| 9 | `src/features/metrics/repository/m3m7.repository.ts` | Repository | 2 raw SQL updates |
| 10 | `src/features/metrics/repository/m4.repository.ts` | Repository | 1 raw SQL update |
| 11 | `src/features/metrics/repository/m5.repository.ts` | Repository | 1 raw SQL update |
| 12 | `src/features/metrics/repository/m6.repository.ts` | Repository | 1 raw SQL update |
| 13 | `src/features/metrics/repository/m8m10.repository.ts` | Repository | 2 raw SQL updates |
| 14 | `src/features/metrics/repository/avg-category.repository.ts` | Repository | 1 raw SQL update |
| 15 | `src/features/metrics/repository/category-performance.repository.ts` | Repository | 1 raw SQL update |
| 16 | `src/features/metrics/repository/category-products.repository.ts` | Repository | 1 raw SQL update |
| 17 | `src/features/metrics/repository/customer-products.repository.ts` | Repository | 1 raw SQL update |
| 18 | `src/features/metrics/repository/high-margin-penetration.repository.ts` | Repository | 2 raw SQL updates |
| 19 | `src/features/dashboard/dashboard.repository.ts` | Repository | 2 raw SQL updates |
| 20 | `src/features/import/import.repository.ts` | Repository | 1 JOIN update |
| 21 | `src/features/settings/division-channels.repository.ts` | Repository | 1 schema update (type) |
| 22 | `src/features/settings/division-channels.schema.ts` | Schema | Update validation schema |
| 23 | `src/features/settings/division-channels.service.ts` | Service | division_id handling in CRUD |
| 24 | `src/features/customers/helper/segment.helper.ts` | Helper | 1 CTE update |

---

## Rollout Strategy

### Development/Staging
- Full reset boleh (user: "schema drop total tidak masalah")
- Run migration → verify → seed → test E2E

### Production
- Sesuaikan backfill logic jika ada data lama
- Backup DB sebelum migration
- Run migration dalam transaction
- Rollback script siap (drop division_id, restore lama)

---

## Success Criteria

✅ **Code Coverage**
- Semua 32 JOIN lokasi sudah update ke integer FK
- scope.ts type signature: `Map<number, number[]>` (bukan string)
- No COALESCE workaround di division matching

✅ **Data Integrity**
- Backfill 100% successful (0 NULL division_id)
- Unique constraint (company_id, division_id) terpenuhi
- FK constraint valid (semua division_id reference existing branch_divisions)

✅ **Test Coverage**
- scope.test.ts: 4 scope-building scenarios dengan integer division_id
- E2E: resolveDivisionScope() → buildDivisionCondition() → query execution
- RBAC: division filter bekerja sesuai user assignment

✅ **No Breaking Changes**
- API response tidak berubah (division_id internal, tidak exposed ke frontend)
- Migration bersifat additive dulu, destructive akhir (rollback-safe)

---

## Notes & Risks

### Risk 1: Backfill Mismatch
- **Jika**: Beberapa division.code tidak cocok dengan branch_divisions.code
- **Mitigasi**: Query validasi pre-migration, manual review mismatch
- **Fallback**: Revert migration, update branch_divisions.code dulu

### Risk 2: Production Data Volume
- **Jika**: division_channels punya jutaan baris
- **Mitigasi**: Backfill dalam batch (LIMIT per iteration)
- **Fallback**: Timeout → split migration jadi 2 step (add column, backfill, make NOT NULL)

### Risk 3: Live Requests Saat Migration
- **Mitigasi**: Maintenance window, turn off enforcement feature flag dulu
- **Fallback**: Revert migration + schema pré-refactor (sudah ada backup)

---

## References

- **MEMORY.md**: Akar problem & prinsip kerja
- **task004.md**: Context division dinamis per company/branch
- **task005.md**: Frontend scope tree (sudah update ke integer division_id)
- **schema-company.ts**: branch_divisions table definition
- **schema-product.ts**: division_channels table definition (sebelum refactor)

---

## Appendix: SQL Migration Template

```sql
-- Migration: 0012_add_division_id_fk.sql
-- Purpose: Refactor division dari varchar code ke integer FK

-- Step 1: Add division_id column
ALTER TABLE division_channels 
ADD COLUMN division_id INT REFERENCES branch_divisions(id) ON DELETE CASCADE;

-- Step 2: Backfill company-wide divisions (branch_id IS NULL di branch_divisions)
UPDATE division_channels dc
SET division_id = bd.id
FROM branch_divisions bd
WHERE bd.company_id = dc.company_id
  AND bd.branch_id IS NULL
  AND bd.code = dc.division
  AND dc.division IS NOT NULL;

-- Step 3: Backfill branch-specific divisions (jika ada)
UPDATE division_channels dc
SET division_id = bd.id
FROM branch_divisions bd
WHERE bd.company_id = dc.company_id
  AND bd.branch_id = dc.branch_id
  AND bd.code = dc.division
  AND dc.division IS NOT NULL
  AND dc.division_id IS NULL;

-- Step 4: Validation — harus 0 baris
SELECT COUNT(*) as unmapped_rows FROM division_channels WHERE division_id IS NULL;

-- Step 5: Make NOT NULL + drop lama
ALTER TABLE division_channels
  ALTER COLUMN division_id SET NOT NULL,
  ADD UNIQUE (company_id, division_id),
  DROP COLUMN division,
  DROP COLUMN branch_id;

-- Step 6: Index untuk common queries
CREATE INDEX idx_division_channels_company_division 
ON division_channels(company_id, division_id);
```

---

**Ready for Implementation**: Rencana sudah lengkap. Siap mulai Phase 1 (Schema + Backfill) saat user konfirmasi.