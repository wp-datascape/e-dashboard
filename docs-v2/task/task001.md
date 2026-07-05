# Task 001 — Isolasi Data Berdasarkan Company, Branch, Division

> Status: 📝 Planning — belum mulai implementasi
> Dibuat: 2026-07-04
> Baca juga: `shared/architecture.md`, `shared/api-conventions.md`, `shared/data-model.md`, `features/permissions.md`, `features/channel-divisions.md`

---

## 1. Latar Belakang & Tujuan

Saat ini isolasi data cuma jalan di level **Company** — lewat tabel `user_companies` + helper `resolveCompanyScope()` di `middleware/auth.ts`. Setiap user cuma bisa lihat data company yang dia terdaftar di `user_companies`, dan pola ini sudah konsisten dipakai di 7 fitur (`customers`, `transactions`, `products`, `metrics`, `import`, `audit`, `settings/high-margin`).

Yang belum ada: pembatasan akses di level **Branch** (cabang) dan **Division** (divisi channel penjualan). Kedua dimensi ini sudah ada di schema DB, tapi cuma sebagai **data referensi/pelaporan**, bukan **kontrol akses user**:

| Dimensi | Tabel terkait | Fungsi saat ini |
|---------|--------------|-----------------|
| Company | `user_companies` | ✅ Kontrol akses — sudah jalan |
| Branch  | `company_branches`, `invoices.branch_name` | ❌ Cuma mapping cabang↔kredensial Accurate. `branch_name` di invoices masih teks bebas, bukan FK |
| Division | `channel_divisions` | ❌ Cuma lookup `channel_name → division` untuk filter laporan. Tidak ada kolom `division` tersimpan di `invoices` |

**Tujuan task ini:** menambahkan Branch dan Division sebagai dimensi kontrol akses baru, dengan model yang sama seperti Company (assign eksplisit per user), supaya user hanya bisa melihat data pada company + branch + division yang jadi hak aksesnya.

---

## 2. Keputusan Desain (Sudah Disepakati)

| Keputusan | Nilai |
|-----------|-------|
| Hierarki | **Company → Branch → Division** (rantai bertingkat 3 level, bukan Branch dan Division sebagai anak Company yang sejajar). Branch selalu di bawah Company. Division selalu di bawah Branch — jadi division cuma bermakna dalam konteks satu branch tertentu. |
| Default akses | **Default deny** — user tanpa assignment company/branch/division eksplisit = **tidak bisa lihat data apa pun** pada dimensi itu. |
| Preseden yang sudah ada | Pola ini **sudah** jadi perilaku `resolveCompanyScope()` hari ini: kalau `scopeIds.length === 0`, repository langsung `return { data: [], total: 0 }`. Jadi behavior "default deny" bukan hal baru — tinggal direplikasi ke branch & division. |
| Bypass otoritas | **Hanya `superadmin`** (`isSuperAdmin` di JWT) yang bypass total, persis seperti company hari ini. **`admin` TIDAK punya hak spesial** — role apa pun selain superadmin (termasuk admin) wajib punya row assignment eksplisit di `user_companies`/`user_branches`/`user_divisions`, sama seperti role lain. Assignment untuk admin boleh dibuat lewat **seeder** (bukan manual satu-satu lewat UI) supaya operasional tidak terganggu, tapi tetap berupa row data eksplisit, bukan bypass di kode. |

> ⚠️ **Temuan riset:** `CRITICAL_RULES.md` (baris 123, sebelum diperbaiki di sesi ini) sempat menulis "`superadmin` + `admin` bypass `user_companies` check" — ini **tidak sesuai kode aktual**. `resolveCompanyScope()` di `middleware/auth.ts` cuma cek `isSuperAdmin`, tidak ada pengecekan role `admin` di mana pun di codebase. Sudah diperbaiki di `CRITICAL_RULES.md` supaya sinkron dengan keputusan di atas.

### Masih perlu keputusan (lihat §7)
- Bagaimana perlakuan baris data yang **tidak match** ke branch/division manapun (lihat §4.3 — data quality risk)?

---

## 3. Model Data (Schema Baru)

Urutan assignment sekarang wajib berjenjang: pilih **Company** → pilih **Branch** (di dalam company itu) → pilih **Division** (di dalam branch itu). Tidak bisa assign division tanpa lebih dulu ada branch, dan tidak bisa assign branch tanpa lebih dulu ada company.

### 3.1 Tabel `user_branches` (baru) — child dari Company

```sql
CREATE TABLE user_branches (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id   INTEGER NOT NULL REFERENCES company_branches(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id, branch_id)
);
```

`company_id` di sini teknisnya redundan (bisa didapat dari `company_branches.company_id`), tapi tetap disimpan eksplisit untuk: (1) validasi sanity-check saat insert (`branch_id` yang dikirim harus benar-benar milik `company_id` yang sama), (2) menghindari extra JOIN saat scope-check company sudah lebih dulu di-resolve.

### 3.2 Tabel `user_divisions` (baru) — child dari Branch, BUKAN child langsung dari Company

```sql
CREATE TABLE user_divisions (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id   INTEGER NOT NULL REFERENCES company_branches(id) ON DELETE CASCADE,
  division    VARCHAR(50) NOT NULL, -- distribution|project|e_commerce|intercompany|freelancer|support
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id, division)
);
```

Key-nya `branch_id`, **bukan** `company_id` — karena division sekarang bertingkat di bawah branch (Company → Branch → Division), jadi assignment division user selalu dalam konteks satu branch spesifik. `company_id` tidak perlu diulang di sini karena sudah pasti didapat lewat `company_branches.company_id` (branch cuma bisa dimiliki 1 company).

**Konsekuensi penting:** karena `user_divisions` mensyaratkan `branch_id`, user **wajib** sudah punya row di `user_branches` untuk branch itu sebelum assignment division-nya bisa berarti apa-apa. Kalau nanti ada row `user_divisions` untuk branch yang usernya sendiri tidak punya akses branch itu (row `user_branches` tidak ada), scope resolver harus mengabaikan row division itu (branch-nya sendiri sudah ke-block duluan) — lihat §4.2.

> **Konfirmasi penamaan (2026-07-04):** value `division` di atas (`distribution`, `project`, dst — value yang sudah ada di `channel_divisions.division` sekarang) **memang** yang dimaksud sebagai "Division" di hierarki Company→Branch→Division ini. Nama tampilan manusiawinya "Channel Distribution", "Channel Project", dst (kata "Channel" di depan cuma label UI, bukan level hierarki terpisah) — di DB tetap disimpan sebagai value pendek (`distribution`, `project`) persis seperti enum yang sudah ada. Tidak perlu tabel/kolom baru untuk ini, tinggal dipakai apa adanya di `user_divisions.division`.

### 3.3 Kolom baru `invoices.branch_id` (FK)

```sql
ALTER TABLE invoices ADD COLUMN branch_id INTEGER REFERENCES company_branches(id);
```

⚠️ **Perlu backfill.** `invoices.branch_name` sekarang cuma teks bebas hasil copy dari Accurate — belum tentu match persis ke `company_branches.name`/`code`. Backfill = `UPDATE invoices SET branch_id = cb.id FROM company_branches cb WHERE cb.company_id = invoices.company_id AND cb.name = invoices.branch_name`, lalu **audit manual** baris yang tidak match (lihat Task E).

### 3.4 Division TIDAK dapat kolom baru di invoices

Berbeda dari branch, division tetap **derived** lewat JOIN ke `channel_divisions` (tidak disimpan sebagai kolom) — konsisten dengan cara filter laporan yang sudah ada sekarang (`business_unit` param di beberapa endpoint). Menyimpan `division` langsung di invoices akan bikin dua sumber kebenaran (kolom vs mapping table) yang bisa desync kalau mapping diubah setelah data invoice masuk.

### 3.5 Catatan penting: `channel_divisions` TETAP company-scoped, bukan branch-scoped

Ini dua hal yang beda dan jangan tertukar:
- **`channel_divisions`** (sudah ada) = tabel **klasifikasi bisnis**: `channel_name → division`, di-scope per `company_id`. Tetap seperti ini, tidak perlu diubah jadi per-branch — klasifikasi "channel DC WEST = divisi distribution" tidak masuk akal berbeda-beda per cabang.
- **`user_divisions`** (baru, §3.2) = tabel **kontrol akses**: siapa boleh lihat divisi apa, di-scope per `branch_id` karena hierarki otoritas yang disepakati adalah Company→Branch→Division.

Konsekuensinya di query: untuk cek "apakah baris invoice ini boleh dilihat user dari sisi division", perlu **dua** JOIN/lookup terpisah — satu ke `channel_divisions` (dapat nilai division dari `channel_name`, di-scope company), satu lagi ke `user_divisions` (cek apakah division itu diizinkan, di-scope branch lewat `invoices.branch_id`). Lihat contoh query di §4.4.

---

## 4. Alur & Logika Akses

### 4.1 Loading scope saat request (mirror pola company)

`authMiddleware()` (`middleware/auth.ts`) sudah query `getUserCompanyIds(userId)` fresh dari DB di setiap request (bukan dari JWT — supaya perubahan RBAC langsung efektif tanpa re-login, dan supaya assignment lewat seeder untuk admin langsung berlaku tanpa perlu re-login juga). Tambahkan 2 query serupa:

```typescript
// auth.repository.ts — baru
export async function getUserBranchScopes(userId: number): Promise<{ company_id: number; branch_id: number }[]>
export async function getUserDivisionScopes(userId: number): Promise<{ branch_id: number; division: string }[]>
```

Di `authMiddleware()`:
```typescript
const [permissions, companyIds, branchScopes, divisionScopes] = await Promise.all([
  getUserPermissions(payload.userId),
  getUserCompanyIds(payload.userId),
  getUserBranchScopes(payload.userId),
  getUserDivisionScopes(payload.userId),
])
c.set('user', { ...payload, companyIds, branchScopes, divisionScopes })
```

### 4.2 Helper resolver baru (mirror `resolveCompanyScope`, tapi berantai)

**Kenapa tidak bisa langsung reuse pola `number[]` seperti company:** branch bertingkat di bawah company (satu user bisa beda branch per company), dan division bertingkat di bawah branch (satu user bisa beda division per branch). Filter-nya harus dua tingkat, dan **resolver division butuh hasil resolver branch** sebagai input — bukan independen dari `resolveCompanyScope` saja seperti branch.

**Bypass: HANYA `isSuperAdmin`** — sudah diputuskan di §2, tidak ada pengecekan role `admin` di resolver ini, persis konsisten dengan `resolveCompanyScope()` yang sudah ada sekarang.

```typescript
// middleware/auth.ts

// undefined = bypass total (superadmin)
// Map kosong = user tidak punya branch sama sekali di company manapun yang di-request → default deny
export function resolveBranchScope(
  c: Context,
  companyScopeIds: number[] | undefined, // hasil resolveCompanyScope
): Map<number, number[]> | undefined {
  const { branchScopes, isSuperAdmin } = c.var.user
  if (isSuperAdmin) return undefined // bypass — lihat semua branch

  const map = new Map<number, number[]>()
  for (const { company_id, branch_id } of branchScopes) {
    if (companyScopeIds && !companyScopeIds.includes(company_id)) continue
    if (!map.has(company_id)) map.set(company_id, [])
    map.get(company_id)!.push(branch_id)
  }
  return map
}

// Division butuh branchScope sebagai input (bukan companyScopeIds) — karena division
// cuma valid dalam konteks branch yang SUDAH lolos resolveBranchScope. Kalau
// resolveBranchScope hasilnya bypass (undefined, superadmin), division juga otomatis bypass.
export function resolveDivisionScope(
  c: Context,
  branchScope: Map<number, number[]> | undefined, // hasil resolveBranchScope
): Map<number, string[]> | undefined {
  const { divisionScopes, isSuperAdmin } = c.var.user
  if (isSuperAdmin) return undefined // bypass — lihat semua division

  const allowedBranchIds = new Set(branchScope ? [...branchScope.values()].flat() : [])
  const map = new Map<number, string[]>()
  for (const { branch_id, division } of divisionScopes) {
    if (!allowedBranchIds.has(branch_id)) continue // branch-nya sendiri sudah tidak diizinkan (lihat §3.2)
    if (!map.has(branch_id)) map.set(branch_id, [])
    map.get(branch_id)!.push(division)
  }
  return map
}
```

### 4.3 Helper query condition builder (baru — `utils/scope.ts`)

Dua helper terpisah karena kolom filter-nya beda: branch filter langsung ke `invoices.branch_id`, division filter butuh JOIN ke `channel_divisions` dulu (lihat §3.5).

```typescript
// utils/scope.ts
import { or, and, eq, inArray, sql } from 'drizzle-orm'

// Untuk branch — filter per company_id (level 1)
export function buildBranchCondition(
  companyCol: any, branchCol: any,
  scopeMap: Map<number, number[]> | undefined,
) {
  if (!scopeMap) return undefined // bypass
  if (scopeMap.size === 0) return sql`false` // default deny total
  const clauses = [...scopeMap.entries()].map(([companyId, branchIds]) =>
    and(eq(companyCol, companyId), inArray(branchCol, branchIds))
  )
  return or(...clauses)
}

// Untuk division — filter per branch_id (level 2), dipakai SETELAH JOIN channel_divisions
export function buildDivisionCondition(
  branchCol: any, divisionCol: any,
  scopeMap: Map<number, string[]> | undefined,
) {
  if (!scopeMap) return undefined
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(([branchId, divisions]) =>
    and(eq(branchCol, branchId), inArray(divisionCol, divisions))
  )
  return or(...clauses)
}
```

**Pemakaian di repository (contoh `customers.repository.ts`):**
```typescript
const branchCond = buildBranchCondition(invoices.company_id, invoices.branch_id, branchScope)

// Division: JOIN channel_divisions (company-scoped, klasifikasi bisnis, §3.5)
//   ON channel_divisions.channel_name = invoices.channel_name
//   AND (channel_divisions.company_id = invoices.company_id OR channel_divisions.company_id IS NULL)
// baru setelah itu filter akses pakai buildDivisionCondition(invoices.branch_id, channel_divisions.division, divisionScope)
```

### 4.4 Contoh alur lengkap 1 request

```
GET /api/v1/customers?company_id=all
  → authMiddleware load:
      companyIds = [1, 3]
      branchScopes   = [{company_id:1, branch_id:10}, {company_id:1, branch_id:11}]
      divisionScopes = [{branch_id:10, division:'distribution'}, {branch_id:10, division:'project'}]
      // catatan: branch_id 11 TIDAK ada di divisionScopes sama sekali → default deny utk division di branch itu
      // catatan: company 3 TIDAK punya branch assignment sama sekali → default deny total utk company 3

  → handler:
      companyScope  = resolveCompanyScope(c, 'all')                → [1, 3]
      branchScope   = resolveBranchScope(c, companyScope)           → Map{ 1: [10, 11] }   (company 3 tidak muncul di Map)
      divisionScope = resolveDivisionScope(c, branchScope)          → Map{ 10: ['distribution','project'] }   (branch 11 tidak muncul)

  → repository:
      WHERE company_id IN (1, 3)
        AND ( (company_id=1 AND branch_id IN (10,11)) )     -- company 3 otomatis tersaring habis, sesuai Map branchScope
        AND ( (branch_id=10 AND division IN ('distribution','project')) )   -- branch 11 otomatis tersaring habis
```

Hasil akhir: user ini cuma bisa lihat data Company 1 / Branch 10 / Division distribution+project. Branch 11 (walau di-assign) tersaring habis di level division karena tidak ada division apa pun yang di-assign untuk branch itu — **default deny berlaku berjenjang**: kalau parent-nya (branch) diizinkan tapi child-nya (division) belum di-assign sama sekali, child-nya dianggap kosong, bukan "tidak dibatasi".

⚠️ Ini konsekuensi langsung dari hierarki + default-deny: admin harus assign division untuk **setiap branch** yang mau benar-benar bisa dilihat user, bukan cuma assign branch-nya saja. Task D2 (warning di UI) jadi makin penting karena ada 2 lapis yang bisa lupa di-assign (branch DAN division), bukan cuma 1.

### 4.5 "Lainnya" untuk division — row/value asli, konsisten dengan branch (§4.6)

**Keputusan final (2026-07-06):** sama seperti branch (§4.6), "Lainnya" untuk division **BUKAN** kategori virtual NULL+full-coverage (desain awal dibatalkan) — melainkan **value `division` asli** yang bisa di-assign biasa:

- `channel_divisions.division` dapat value ke-7: **`'other'`** ("Lainnya"), di samping 6 value existing (`distribution|project|e_commerce|intercompany|freelancer|support`). Channel yang tidak match rule manapun di-assign eksplisit ke `division = 'other'` (lewat row `channel_divisions` biasa, atau default fallback saat tidak ada match — detail implementasi menyusul di Task C).
- `user_divisions.division` bisa berisi `'other'` seperti value lain — admin assign akses ke division "Lainnya" per branch lewat UI RBAC (Task D1) seperti biasa.
- **Tidak ada perubahan** di `buildDivisionCondition` (§4.3) — "Lainnya"/`'other'` diperlakukan identik dengan division lain: default-deny berlaku sama (user tidak lihat `'other'` kalau tidak di-assign eksplisit), tidak ada pengecualian/bypass.
- `hasFullDivisionCoverage()` dan klausa `OR division IS NULL` di desain sebelumnya **dibatalkan** — tidak dibutuhkan lagi.

Dampak: JOIN `channel_divisions` (Task C8) perlu strategi eksplisit untuk channel yang belum ada rule-nya — assign ke `division='other'` (row default per company, atau global) alih-alih dibiarkan tidak match/NULL.

### 4.6 "Lainnya" untuk branch — **revisi (2026-07-06): row asli, bukan NULL+full-coverage**

Desain awal §4.6 (full-coverage + `branch_id IS NULL`) **dibatalkan** setelah audit data riil (Task A5) di company 1 (`PT Mesin Kasir Online`). Temuan: `company_branches` cuma seed 1 baris ("Pusat") untuk company 1, padahal di Accurate company 1 sebenarnya punya 2 branch riil (**Jakarta**, **Surabaya**) — dan "Pusat" ternyata bukan branch sungguhan, tapi bucket untuk invoice yang memang tidak ada info branch di Accurate (branch_name NULL).

**Keputusan final:** "Lainnya" adalah **row `company_branches` biasa** (bukan kategori virtual):
- Row lama "Pusat" (`id=1, company_id=1`) di-**repurpose**: `name` → `'Lainnya'`, `code` → `'LAINNYA'`.
- Ditambah 2 row branch riil baru untuk company 1: `Jakarta` (`JKT`), `Surabaya` (`SBY`).
- Backfill (`scripts/backfill-invoice-branch-id.ts`): invoice dengan `branch_name` yang match nama branch (case-insensitive) → `branch_id` branch itu. Invoice dengan `branch_name` NULL (tidak ada info branch sama sekali) → `branch_id` = branch "Lainnya" company itu. Hasil di data lokal: 4214 baris match nama (Jakarta+Surabaya), 2208 baris NULL → "Lainnya". **0 baris tersisa NULL.**

**Kenapa ini jauh lebih simpel dari desain full-coverage sebelumnya:** karena "Lainnya" adalah branch row asli dengan `id` sungguhan, `buildBranchCondition` (§4.3) TIDAK perlu diubah/ditambah klausa apa pun — "Lainnya" diperlakukan identik dengan Jakarta/Surabaya/branch lain: admin assign akses ke branch "Lainnya" seperti biasa lewat `user_branches`, default-deny berlaku sama seperti branch lain (bukan pengecualian). Tidak ada lagi kebutuhan `hasFullBranchCoverage()`, tidak ada lagi `allBranchesByCompany` lookup tambahan — Task B1/B4 **dibatalkan** kebutuhan tambahannya (lihat update Task B di §5).

⚠️ **Follow-up wajib sebelum Task A4 dijalankan ke production (masuk Task E):** company 1 di production kemungkinan besar punya masalah struktural yang sama (`company_branches` cuma "Pusat", padahal Accurate riil punya Jakarta+Surabaya) — perlu audit & fix data yang sama (repurpose "Pusat"→"Lainnya" + insert branch riil) SEBELUM backfill dijalankan di production, bukan asumsi otomatis "Pusat" di company lain juga berarti "Lainnya" (company 3 kemungkinan besar memang single-branch sungguhan, bukan bucket "Lainnya" — perlu dicek per company, jangan digeneralisasi).

**Konfirmasi (2026-07-06):** division (§4.5) ikut disederhanakan dengan pola yang sama — `division = 'other'` sebagai value asli yang bisa di-assign biasa di `user_divisions`, bukan NULL+full-coverage. Arsitektur branch dan division sekarang konsisten: keduanya pakai "value/row asli", tidak ada logic full-coverage di manapun.

**Task yang perlu update:** Task G1 (test case: user tanpa assignment ke branch/division "Lainnya" tidak melihat baris itu, sama seperti division/branch lain manapun).

---

## 5. Breakdown Task

### Task A — Schema & Migration (Backend)
- [ ] A1. Tulis Drizzle schema `user_divisions.ts`, `user_branches.ts`
- [ ] A2. Tambah kolom `invoices.branch_id` (nullable dulu, FK ke `company_branches`)
- [ ] A3. `drizzle-kit generate` + `drizzle-kit migrate`
- [ ] A4. Script backfill `invoices.branch_id` dari `branch_name` (manual, ikuti pola `postgres.js` di `CRITICAL_RULES.md` § Migration Limitation)
- [ ] A5. Audit hasil backfill — hitung berapa % baris invoices yang **tidak** ketemu `branch_id` (lihat Task E)

### Task B — Backend Core (Scope Resolver & Middleware)
- [ ] B1. `auth.repository.ts` — `getUserBranchScopes()`, `getUserDivisionScopes()`
- [ ] B2. `middleware/auth.ts` — extend `authMiddleware()` load scope baru, extend tipe `c.var.user`
- [ ] B3. `middleware/auth.ts` — `resolveBranchScope()` (input: `companyScopeIds`), `resolveDivisionScope()` (input: hasil `resolveBranchScope`, BUKAN companyScopeIds — lihat §4.2) — keduanya cuma cek `isSuperAdmin`, tidak ada bypass untuk role `admin`
- [ ] B4. `utils/scope.ts` (baru) — `buildBranchCondition()`, `buildDivisionCondition()` (2 helper terpisah, lihat §4.3). "Lainnya"/`'other'` (§4.5, §4.6) tidak butuh helper tambahan — diperlakukan sama seperti branch/division lain
- [ ] B5. Seeder: assign row `user_companies`/`user_branches`/`user_divisions` eksplisit untuk user `admin` existing (bukan bypass kode) — lihat Task F1

### Task C — Repository Updates (7 fitur existing yang sudah pakai `resolveCompanyScope`)
Update tiap handler + repository untuk terima & apply `divisionScope`/`branchScope` di samping `companyScope` yang sudah ada:
- [x] C1. `customers.handler.ts` + `customers.repository.ts` — selesai (2026-07-06). Division/branch di-derive dari invoice terbaru customer, diverifikasi end-to-end (default-deny, division-restricted, branch-restricted).
- [x] C2. `transactions.handler.ts` + `transactions.repository.ts` — selesai (2026-07-06), termasuk `findInvoiceDetail` (sebelumnya cuma company-scope, sekarang ikut branch/division).
- [x] C3. `products.handler.ts` + `products.repository.ts` — **tidak perlu perubahan**. `products` cuma master data (nama, kategori, company_id), tidak ada dimensi branch/division sama sekali. Workbench "Product Trend" yang bersinggungan branch/division ternyata di fitur metrics (C4), bukan di sini.
- [x] C4. `metrics.handler.ts` + 11 repository (bukan 5 seperti draf awal — ditemukan `avg-category`, `category-performance`, `category-products`, `customer-products`, `high-margin-penetration` juga butuh scope, plus `dashboard.repository.ts`) — selesai (2026-07-06). **Ditemukan & diperbaiki bug kritis sekalian**: `resolveCompanyScope()` dipanggil di semua 12 handler metrics tapi return value-nya dibuang — query jalan tanpa filter company sama sekali saat `company_id=all` diminta, untuk SEMUA role (bukan cuma superadmin/admin). Bug ini sudah ada SEBELUM task ini, tidak terkait branch/division — diperbaiki bersamaan karena wiring branchScope/divisionScope butuh companyScopeIds yang benar sebagai basis. Diverifikasi: user 1-company vs full-access user dapat `active_count` berbeda (588 vs 953) untuk request `company_id=all` yang sama.
- [x] C5. `import.handler.ts` + `import.repository.ts` — **keputusan (2026-07-06)**: `import_logs` tetap company-scope saja (TIDAK ditambah branch/division scope). Alasan: 1 import log = 1 event upload yang bisa berisi invoice lintas banyak branch sekaligus, tidak ada relasi 1:1 branch/division di level log — beda dari `invoices` yang per-baris. Fix C8 (channel_divisions JOIN company_id) tetap diterapkan di `upsertCustomer()`.
- [x] C6. `audit.handler.ts` + `audit.repository.ts` — **sudah diputuskan (§7.2)**: tetap di-scope `company_id` saja (pola existing, tidak berubah), TIDAK perlu tambah branch/division scope karena akses endpoint ini sudah dibatasi lewat permission ke role setingkat direktur/superadmin
- [x] C7. `settings/high-margin.handler.ts` + `high-margin.repository.ts` — **tidak perlu perubahan**. `high_margin_products` cuma master data klasifikasi produk (company-wide, range tanggal efektif), tidak ada dimensi branch/division — status "produk ini high-margin" tidak berbeda per cabang. Sama seperti C3 (products) dan C5 (import_logs).
- [x] C8. JOIN `channel_divisions` yang tidak match `company_id` — **selesai (2026-07-06)**. Sudah benar di semua file raw-SQL (metrics, dashboard, threshold, segment.helper — ternyata sudah diperbaiki sesi sebelumnya). Yang masih bolong (Drizzle query builder): `customers.repository.ts`, `transactions.repository.ts`, `import.repository.ts` — sudah diperbaiki, pakai pola `OR company_id IS NULL` + prioritaskan rule company-specific di atas rule global kalau kebetulan ada dua-duanya.

### Task D — RBAC UI (Frontend)
- [ ] D1. `CreateUserDialog.tsx` / `EditUserDialog.tsx` — UI assignment 3 tingkat: pilih Company → per company pilih Branch → per branch pilih Division. Bukan 3 multi-select flat yang independen — struktur pohon, karena pilihan di tingkat bawah dibatasi oleh pilihan di tingkat atas
- [ ] D2. Warning eksplisit di UI kalau ada company tanpa branch ter-assign, ATAU branch tanpa division ter-assign ("User ini tidak akan bisa lihat data apa pun di Branch X sampai division di-assign") — dua lapis peringatan, bukan cuma satu, sesuai §4.4
- [ ] D3. `ViewUserDialog.tsx` — tampilkan pohon assignment Company→Branch→Division
- [ ] D4. Backend: `user.schema.ts`, `user.service.ts`, `user.repository.ts` — terima payload nested `{ company_id, branch_ids: [{ branch_id, divisions: [] }] }`, replace pattern (mirror `replaceUserCompanies`) untuk ketiga tabel sekaligus dalam satu transaksi (supaya tidak ada state invalid, mis. division ter-assign tapi branch parent-nya dihapus)
- [ ] D5. i18n — semua label baru wajib masuk `en.json` + `id.json` (lihat `CRITICAL_RULES.md`)

### Task E — Data Audit & Backfill
- [ ] E1. Audit `invoices.branch_name` vs `company_branches.name` — laporan % match/tidak match per company
- [ ] E2. Untuk baris tidak match: putuskan strategi (perbaiki data source di Accurate, normalisasi manual, atau biarkan `branch_id NULL` dengan aturan eksplisit — lihat §6 risiko)
- [ ] E3. Audit `invoices.channel_name` vs `channel_divisions.channel_name` — channel yang belum ter-mapping ke division manapun

### Task F — Rollout & Migrasi User Existing
- [ ] F1. **Sebelum enforcement diaktifkan:** seeder backfill `user_branches`/`user_divisions` untuk **semua** user existing (termasuk role `admin` — admin TIDAK bypass, lihat §2) berdasarkan akses company mereka saat ini: assign ke SEMUA branch dalam company yang sudah mereka punya di `user_companies`, dan SEMUA division dalam tiap branch itu, supaya tidak ada yang tiba-tiba kehilangan akses saat fitur ini di-deploy
- [ ] F2. Deploy schema + kode dengan scope resolver **tidak aktif** dulu (feature flag / semua scope map dianggap bypass) — validasi tidak ada regresi
- [ ] F3. Aktifkan enforcement bertahap lewat feature flag `enforcement_enabled` per company (mis. 1 company dulu) sambil pantau audit log/keluhan akses — **catatan (§7.4)**: ini cuma toggle aktivasi, bukan proses build terpisah; semua company dapat kode & schema yang sama dari satu rilis
- [ ] F4. Setelah stabil, buka RBAC UI untuk admin mulai atur assignment granular per user baru (assignment admin baru pun tetap lewat form yang sama — tidak ada bypass, cuma proses awal migrasinya yang dipercepat lewat seeder)

### Task G — Testing
- [ ] G1. Unit test `resolveDivisionScope`/`resolveBranchScope`/`buildScopedCondition` — kasus bypass, default-deny (map kosong), multi-company beda scope
- [ ] G2. E2E: user dengan division A di company 1 tidak bisa lihat data division B company 1
- [ ] G3. E2E: user tanpa assignment branch sama sekali di company manapun → semua endpoint yang butuh branch scope return kosong, bukan error
- [ ] G4. Regression: user existing (sebelum fitur ini) tetap bisa akses seperti biasa setelah Task F1 (backfill) selesai

---

## 6. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| `invoices.branch_name` tidak match rapi ke `company_branches` | Backfill `branch_id` NULL di banyak baris → data "hilang" dari view user yang di-scope branch | **Sudah dieksekusi di data lokal (Task A4/A5, 2026-07-06):** ketemu company 1 cuma seed 1 branch ("Pusat") padahal Accurate riil punya Jakarta+Surabaya. Diperbaiki: repurpose "Pusat"→"Lainnya" + insert branch riil, backfill 100% (§4.6). **Production perlu audit serupa sebelum backfill dijalankan di sana (Task E).** |
| JOIN `channel_divisions` existing tidak match `company_id` | Kalau dipakai juga untuk enforcement akses (bukan cuma filter laporan), bisa salah scoping lintas company | Task C8 — perbaiki JOIN condition dulu |
| Default-deny **berjenjang** (Company→Branch→Division) | Admin assign branch tapi lupa assign division di bawahnya (atau sebaliknya) → user "hilang akses" mendadak di level yang lebih dalam, terlihat seperti bug padahal by design | Task D2 — warning eksplisit di 2 lapis (branch tanpa division, company tanpa branch) |
| User existing (termasuk `admin`, karena admin tidak lagi bypass) tiba-tiba kehilangan akses saat fitur pertama kali deploy | Gangguan operasional besar kalau tidak di-migrasi dulu | Task F1 — wajib seeder backfill assignment dulu sebelum enforcement aktif, admin diperlakukan sama seperti user lain |
| Audit log ikut ke-filter tanpa sengaja | ~~Investigasi/kepatuhan jadi tidak lengkap~~ — **sudah diputuskan (§7.2):** tetap company-scope, tidak turun ke branch/division | Task C6 sudah final, tidak perlu keputusan tambahan |

---

## 7. Pertanyaan Terbuka (perlu dijawab sebelum mulai coding)

~~1. Bypass admin~~ — **sudah diputuskan**: hanya `superadmin` yang bypass, `admin` wajib assignment eksplisit (boleh lewat seeder). Lihat §2.

~~2. Audit log~~ — **sudah diputuskan (2026-07-06)**: `audit_logs` **tetap di-scope `company_id`** (pola existing, tidak berubah) — beda dari rekomendasi awal draft ini ("tetap full"). Alasan: division tidak pernah punya hak lihat audit log sama sekali; akses ke endpoint ini dibatasi lewat permission khusus role setingkat direktur/superadmin. Karena batas akses sudah berhenti di company (tidak pernah turun ke branch/division), tidak perlu tambah branch/division scope di endpoint ini. Lihat update Task C6.

~~3. Baris data tanpa branch/division match (NULL)~~ — **sudah diputuskan & final (2026-07-06, direvisi dari draf awal)**: baik branch maupun division punya kategori **"Lainnya"**, tapi bukan kategori virtual NULL+full-coverage seperti draf awal — melainkan **row/value asli**:
   - **Branch:** "Lainnya" adalah row `company_branches` biasa (hasil repurpose branch "Pusat" yang ternyata bukan branch riil, ditemukan lewat audit Task A5 — lihat §4.6). Invoice tanpa `branch_name` di-backfill ke `branch_id` "Lainnya" ini, bukan dibiarkan NULL.
   - **Division:** "Lainnya" adalah value asli `division='other'` di `channel_divisions`/`user_divisions`, di samping 6 value existing (lihat §4.5).
   - Konsekuensinya: **tidak ada logic khusus** di `buildBranchCondition`/`buildDivisionCondition` (§4.3) untuk kategori ini — keduanya diperlakukan identik dengan branch/division lain, default-deny biasa, admin assign akses lewat `user_branches`/`user_divisions` seperti biasa. Jauh lebih simpel dari desain full-coverage yang sempat dirancang sebelumnya.

~~4. Timing rollout~~ — **sudah diputuskan (2026-07-06)**: deploy sekaligus semua fitur, bukan bertahap per company. Prosesnya memang tidak berbeda secara teknis — schema, kode, dan migration ditulis & dirilis sekali untuk semua company. Task F3 (aktivasi bertahap) tetap dipertahankan, tapi cuma sebagai **toggle aktivasi** (feature flag `enforcement_enabled` per company), bukan proses build terpisah: Task A–D + F1 selesai dan dirilis sekaligus, lalu F2 (validasi tanpa enforcement) dan F3 (nyalakan bertahap) tinggal soal kapan flag di-flip per company. Alasan tetap pakai flag bertahap walau "prosesnya sama": sistem ini sudah live production, dan default-deny + risiko backfill `branch_id` yang belum tentu 100% bersih (Task E) berarti kalau ada company yang datanya kurang rapi, blast radius kesalahan kebatasi ke company itu dulu — bukan langsung semua user di semua company kehilangan akses bersamaan.

---

## 8. Referensi Kode (hasil riset, per 2026-07-04)

- `backend/src/middleware/auth.ts` — `resolveCompanyScope()`, `authMiddleware()`
- `backend/src/features/auth/auth.repository.ts` — `getUserCompanyIds()`, `getUserPermissions()`
- `backend/src/features/customers/customers.repository.ts` — pola `scopeIds` + JOIN `channel_divisions` existing
- `backend/src/features/users/user.repository.ts` — `replaceUserCompanies()` (pola replace assignment)
- `backend/src/db/schema/{company_branches,channel_divisions,invoices,user_companies}.ts`
- 7 handler yang pakai `resolveCompanyScope`: `customers`, `transactions`, `products`, `metrics`, `import`, `audit`, `settings/high-margin`
