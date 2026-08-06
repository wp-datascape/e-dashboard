# Task 022 — Audit Lanjutan RBAC: Dormant Threshold Bocor Lintas Company + 3 Endpoint Settings Tanpa Scope Check

> Status: SELESAI, dikerjakan & diverifikasi 2026-08-06. Lanjutan [[task015]]
> (RBAC Scope Audit) dan [[task018]] (Isolasi Branch/Division Customer) — audit
> ke-3 di seri yang sama, dipicu laporan user: "kenapa persentase M5 High
> Margin Penetration beda antara user superadmin dan mko.executive?"

## 1. Latar Belakang

User melaporkan angka M5 (High Margin Penetration) beda antara sesi superadmin
dan sesi `mko.executive@semanggi.id`. Investigasi awal (bandingkan scope
company=MKO eksplisit di kedua user) tidak menemukan selisih — baru ketemu
saat user secara spesifik minta dibandingkan skenario **company_id="All
Entities"** vs company eksplisit untuk user YANG SAMA. Root cause ternyata
sama sekali bukan soal user superadmin vs non-superadmin, tapi bug di resolusi
threshold dormant yang mempengaruhi SEMUA user (termasuk superadmin) begitu
filter "All Entities" dipilih.

## 2. Temuan 1 — `resolveDormantMonths()` bocor lintas company

**File**: `backend/src/features/config/threshold.ts`

Fungsi ini menentukan ambang batas "dormant" (dipakai klasifikasi existing/
active/dormant customer di M3–M10 dan halaman Customers) dengan mencari
**divisi paling dominan** (berdasar jumlah invoice) di company yang di-scope.
Kondisi filter company sebelumnya:

```sql
WHERE (cid = 0 OR company_id = cid)
```

`cid = 0` adalah sentinel untuk "company_id='all'" — begitu true, kondisi ini
jadi `TRUE` tanpa syarat, scan **SEMUA company lintas holding**, bukan cuma
company yang jadi scope user (parameter `companyScopeIds` yang harusnya
membatasi ini SAMA SEKALI tidak dikirim ke fungsi ini oleh kedua caller-nya).

**Dampak nyata**: company dengan volume invoice jauh lebih besar (PT KNT
~182rb invoice vs PT MKO ~7rb) mendominasi hasil pencarian "divisi paling
dominan", sehingga `dormant_category` yang kepilih untuk MENGHITUNG data MKO
salah total begitu filter "All Entities" dipilih — walau data MKO yang
ditampilkan sendiri tetap benar-benar cuma MKO (bukan kebocoran data mentah,
cuma SATU ANGKA KONFIGURASI yang salah karena "mengintip" volume invoice
company lain untuk menentukan angka itu).

**Verifikasi** (production, `period_end=2026-06-30`, company=MKO):
existing_customers `329` (company_id=1 eksplisit) vs `482` (company_id='all')
— seharusnya identik. Setelah fix: `329` = `329`.

**Fix**: `resolveDormantMonths(cid, dormant, companyScopeIds?)` sekarang
reuse `buildCompanyConditionRaw` (util yang sama dipakai di seluruh
repository metrics/analisis untuk menangani `cid=0+scopeIds` vs
`cid=0+bypass-superadmin` dengan benar) — thread `companyScopeIds` dari
kedua caller: `metrics.service.ts` (`resolveSegmentParams`) dan
`customers.repository.ts` (`findCustomers`).

## 3. Temuan 2 — 3 endpoint Settings tanpa `resolveCompanyScope()` sama sekali

Ditemukan lewat audit proaktif setelah temuan 1 (grep pola `cid=0` serupa di
seluruh backend) — BEDA KATEGORI dari temuan 1: bukan cuma angka konfigurasi
yang salah, tapi **data mentah company lain benar-benar dikembalikan ke
response**, dan **tidak perlu filter "All Entities"** — cukup ganti
`company_id` di query string secara manual ke company yang bukan hak akses
user.

| Endpoint | Data yang bocor | Permission | Severity |
|---|---|---|---|
| `GET /settings/channel-divisions/unmapped-channels` | `channel_name` asli dari invoice company lain | `settings.channel.division:view` (role admin) | Tinggi — data bisnis riil |
| `GET /settings/divisions/values` | Label/key division company lain | `settings.division:view` (role admin) | Sedang |
| `GET /settings/item-types/values` | Label item type company lain | **TIDAK ADA** — siapa pun login bisa akses | Sedang, tapi blast radius terbesar (semua role) |

Root cause: ketiga handler memakai `query.company_id` mentah untuk query DB,
tidak pernah memanggil `resolveCompanyScope(c, query.company_id)` — beda dari
pola yang SEHARUSNYA konsisten di semua handler lain (termasuk 3 fungsi
sibling di file yang sama, `findChannelDivisions`/`listChannelDivisionsService`
dkk, yang sudah benar sejak [[task015]] §2b). Ketiga fungsi ini kelewat waktu
audit task015 karena pola signature-nya (`companyId: number | 'all'` polos,
bukan `scopeIds?: number[]`) beda dari fungsi-fungsi yang jadi fokus audit
saat itu.

**Verifikasi exploit nyata** (production, token asli via `jsonwebtoken`
+ `JWT_SECRET` produksi, replay lewat `curl` ke `api.semanggi.id`):
- `knt.executive@semanggi.id` (scope company=2/KNT) → `GET
  .../unmapped-channels?company_id=1` → `200 OK`, balikin channel_name MKO.
- `mko.sales@semanggi.id` (scope company=1/MKO) → `GET
  .../divisions/values?company_id=2` → `200 OK`, balikin division KNT.
- `knt.executive` → `GET .../item-types/values?company_id=1` → `200 OK`,
  balikin item type MKO.

Setelah fix, ketiga request di atas → `403 FORBIDDEN`.

**Fix**: tambah `resolveCompanyScope(c, query.company_id)` di tiap handler
(throw 403 kalau `company_id` eksplisit di luar akses user, atau resolve ke
`scopeIds` array kalau `'all'`), thread `scopeIds` sampai ke repository query
(`inArray`/`buildCompanyConditionRaw`, bukan naive `cid=0` check).

## 4. Audit Verifikasi — M1–M10 × 4 User

Untuk memastikan tidak ada bug isolasi serupa tersisa di metrik lain, semua
10 KPI diuji ulang dengan 4 user (superadmin, `mko.executive` — admin/MKO,
`mko.sales` — user/MKO, `knt.executive` — admin/KNT), tiap user dibandingkan
`company_id` eksplisit vs `'all'` (harus identik untuk scope yang sama).
Metode: request HTTP nyata ke `api.semanggi.id` dengan token JWT asli per
user (mint langsung pakai `JWT_SECRET` produksi, tanpa perlu password user).

| KPI | Hasil |
|---|---|
| M1/M2 Cross-Selling | ✅ Identik di semua kombinasi |
| M3 Revenue / M4 GP | ✅ Identik |
| M5 High Margin Penetration | ✅ Identik (KNT 0% — belum ada `high_margin_products` dikonfigurasi utk company itu, bukan bug) |
| M6 Repeat Order Rate | ✅ Identik (sudah benar dari awal — `fetchRorBreakdown` & `repeat_orders` CTE sudah pakai `buildCompanyConditionRaw`) |
| M7 Expansion Rate | ✅ Identik |
| M8/M9/M10 Dormant/Reactivation | ✅ Identik |

## 5. Yang SENGAJA di luar scope

- Tidak audit ulang seluruh RBAC dari nol — cuma pola spesifik yang ditemukan
  (`cid=0`/`companyId: number|'all'` tanpa `scopeIds`) di-grep menyeluruh dan
  dipastikan tidak ada instance lain yang kelewat (hasil: 3 file di atas,
  semua sudah fix).
- Tidak menambah automated test/regression suite untuk pola bug ini secara
  khusus — verifikasi murni manual (query langsung + replay HTTP token asli)
  karena sifatnya investigasi reaktif, bukan pengembangan fitur baru.

## 6. Pelajaran untuk Pattern RBAC ke Depan

Dua kelas bug BERBEDA yang perlu dibedakan saat audit serupa di masa depan:

1. **Bocor ke perhitungan** (temuan 1) — data company lain tidak pernah
   tampil ke user, tapi ikut dipakai menghitung SATU nilai konfigurasi/
   agregat yang mempengaruhi hasil akhir untuk company yang benar. Lebih
   sulit ketemu (angka "kelihatan masuk akal", cuma beda tanpa alasan jelas)
   tapi severity lebih rendah (tidak ada kerahasiaan yang dilanggar).
2. **Bocor ke response langsung** (temuan 2) — data mentah company lain
   benar-benar dikembalikan. Lebih mudah ketemu (tinggal test cross-company
   company_id di query param) tapi severity lebih tinggi.

**Checklist audit untuk endpoint baru**: setiap handler yang menerima
`company_id` dari request (query/body/param) — baik implisit ('all') maupun
eksplisit — WAJIB panggil `resolveCompanyScope()` sebelum data dipakai,
TERMASUK untuk fungsi yang "cuma" dipakai isi dropdown/opsi filter (bukan
tabel data utama) — kategori endpoint yang paling sering kelewat audit karena
terasa "kurang penting" dibanding endpoint list/detail utama.
