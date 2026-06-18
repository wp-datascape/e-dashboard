# transaction-workbench/overview.md

> Ringkasan halaman untuk Transaction & Revenue Workbench (Group 4).
> Sumber: `FINALIZED_MENU_STRUCTURE.md` Group 4.
> Baca juga: `transaction-workbench/decisions.md`, `shared/data-model.md`

## Tujuan Group

Menjawab "kapan dan bagaimana transaksi terjadi" — ledger invoice, tracking project milestone, analisis loyalitas repeat order.

---

## 4.1 B2B DC & B2C Order Ledger

Status: New

Tabel invoice semua transaksi dengan filter business_unit. Berbeda dari Customer 360 (2.1) yang fokus per customer — halaman ini fokus per transaksi/invoice.

Kolom yang diharapkan: invoice_number, invoice_date, customer_name, business_unit, total_revenue, total_gp, product_categories (aggregated), import_source.

Filter: company_id, business_unit, period range, customer search.

Butuh: field `customers.business_unit` (sama seperti blocker di customer-workbench 2.1). Tanpa field ini, filter BU tidak bisa diimplementasi — tapi halaman bisa dibuat tanpa filter BU dulu sebagai interim.

Data tersedia dari tabel `invoices JOIN customers` — tidak perlu tabel baru.

---

## 4.2 B2B Project Milestone Ledger

Status: New — Open Decision apakah masuk MVP.

FINALIZED_MENU_STRUCTURE.md menandai ini "High Complexity." Butuh tabel `projects` baru dengan kolom milestone tracking yang tidak ada di schema saat ini. Business logic berbeda dari invoice regular — satu project bisa punya N milestone dengan nilai kontrak terpisah.

Keputusan apakah masuk MVP belum dibuat. Lihat `transaction-workbench/decisions.md` untuk detail implikasi.

Jangan asumsikan status (in-scope atau out-of-scope) — tulis sebagai open decision sampai tim mengkonfirmasi.

---

## 4.3 Repeat Order & Loyalty Tracker

Status: Reusable — dari CustomerMetrics existing.

Drill-down dari M6 Repeat Order Rate. Chart `RadialBarWidget` sudah ada dan bisa direuse. Endpoint `GET /metrics/repeat-order-rate` sudah didefinisikan.

Alokasi M6 ke Group 4 (bukan Group 2) sesuai FINALIZED_MENU_STRUCTURE.md karena M6 mengukur frekuensi transaksi (event) bukan profil customer. Lihat `transaction-workbench/decisions.md` jika ada konflik alokasi dengan customer-workbench.

---

## Reused Components

| Halaman | Components |
|---------|-----------|
| 4.1 Order Ledger | MUI X DataGrid (server-side pagination) |
| 4.2 Project Milestone | MUI X DataGrid + custom milestone timeline (belum ada, perlu dibuat jika in-scope) |
| 4.3 Repeat Order | RadialBarWidget (M6) |

---

## Blocker

- `customers.business_unit` belum ada — filter BU di 4.1 tidak bisa diimplementasi penuh
- Tabel `projects` belum ada — 4.2 tidak bisa dimulai sampai keputusan MVP dibuat
- Konfirmasi apakah M6 dialokasikan ke Group 4 atau tetap di Group 2 (lihat decisions.md)
