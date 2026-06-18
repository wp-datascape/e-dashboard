# customer-workbench/decisions.md

> Keputusan dan inferensi untuk Customer Workbench (Group 2).
> Baca juga: `customer-workbench/overview.md`, `customer-workbench/api.md`, `product-workbench/decisions.md` (belum ada saat file ini ditulis)

---

## Keputusan yang Sudah Diambil

### Split CustomerMetrics → 2.2 (Expansion) + 3.2 (High Margin Push List)

Halaman CustomerMetrics existing dipecah jadi dua halaman di dua workbench berbeda:

- **2.2 Expansion & Upsell Targets** (customer-workbench) — customer yang spending-nya naik/turun, dari `GET /metrics/expansion-rate` + `GET /metrics/expansion-rate/detail`.
- **3.2 High Margin Push List** (product-workbench) — produk/kategori margin tinggi yang berpotensi cross-sell, detail metrik belum ditulis (lihat `product-workbench/decisions.md` saat sudah dikerjakan).

Rasional: dua persona berbeda — sales rep fokus relationship per customer (2.2) vs product/category manager fokus margin (3.2). Sumber data sama (`invoice_items`, `customers`), agregasi beda.

Status: arah split disepakati. Alokasi kolom/metrik persis ke masing-masing halaman **belum final** — lihat Keputusan Terbuka #1.

---

## Keputusan Terbuka

### 1. Alokasi kolom CustomerMetrics ke 2.2 vs 3.2

Belum diputuskan kolom mana exclusive ke 2.2, mana ke 3.2, mana dipakai di keduanya (contoh: `avg_gp` di response `expansion-rate/detail` mungkin relevan juga untuk 3.2). File ini dan `product-workbench/decisions.md` harus saling merujuk begitu yang kedua ditulis. Jangan anggap skema response di `customer-workbench/api.md` final sebelum itu terjadi.

### 2. Sumber pengisian `customers.business_unit`

Tiga opsi belum diputuskan: manual dari UI Customer 360, ikut import data faktur (jika Accurate punya field setara), atau infer dari tipe transaksi. Detail teknis field ada di `customer-workbench/api.md` bagian "Field Baru yang Dibutuhkan di Schema" — tidak diulang di sini, hanya ditandai sebagai blocker untuk:

- Filter `business_unit` di `GET /customers/360`
- Kolom `business_unit` di tabel 2.1 dan 2.2
- Konsistensi label business_unit lintas Group 2 dan Group 3

Implikasi: sampai opsi pengisian diputuskan, asumsikan akan ada baris dengan `business_unit: null` saat 2.1 pertama kali deploy — UI harus menangani kasus ini, bukan mengasumsikan data selalu lengkap.

---

## Inferensi — Status Halaman

| Halaman | Status | Alasan |
|---------|--------|--------|
| 2.1 Customer 360 & Segmentation | New | `business_unit`, `avg_monthly_revenue`, `lifetime_value`, `category_count` tidak ada di `GET /customers` existing |
| 2.2 Expansion & Upsell Targets | New (sebagian) | Summary (`GET /metrics/expansion-rate`) sudah ada; detail (`GET /metrics/expansion-rate/detail`) baru didesain |
| 2.3 Churn Risk & Dormant | Existing | Endpoint lengkap, sudah diimplementasi di frontend |
| 2.4 Cross-sell Matrix | Existing | Endpoint lengkap, sudah diimplementasi di frontend |

---

## Catatan untuk Sesi Selanjutnya

- Setelah `product-workbench/decisions.md` ditulis, kembali ke sini untuk mengisi Keputusan Terbuka #1.
- Jangan duplikasi detail teknis `business_unit` di file ini — itu sudah ada di `api.md`, cukup rujuk.
