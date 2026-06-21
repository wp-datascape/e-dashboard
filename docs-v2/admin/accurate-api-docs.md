# Accurate Online API Documentation

> Dokumentasi API Accurate Online yang diekstrak dari halaman developer resmi (https://account.accurate.id/developer/api-docs.do).
> Sumber: Area Developer Accurate Online — Dokumentasi API
> Last updated: 2026-06-22

---

## Daftar Isi

- [1. API Dasar (Nucleus)](#1-api-dasar-nucleus)
  - [Endpoint: /api](#11-endpoint-api)
- [2. API Accurate](#2-api-accurate)
  - [Master Data](#21-master-data)
    - /api/customer — Pelanggan
    - /api/customer-category — Kategori Pelanggan
    - /api/customer-claim — Klaim Pelanggan
    - /api/vendor — Pemasok
    - /api/vendor-category — Kategori Pemasok
    - /api/vendor-claim — Klaim Pemasok
    - /api/item — Barang & Jasa
    - /api/item-category — Kategori Barang
    - /api/glaccount — Akun Perkiraan
    - /api/branch — Cabang
    - /api/department — Departemen
    - /api/employee — Karyawan
    - /api/currency — Mata Uang
    - /api/unit — Satuan Barang
    - /api/tax — Pajak
    - /api/warehouse — Gudang
    - /api/shipment — Pengiriman
    - /api/project — Proyek
    - /api/payment-term — Syarat Pembayaran
    - /api/fob — FOB
    - /api/data-classification — Kategori Keuangan
    - /api/auto-number — Penomoran
    - /api/access-privilege — Akses Grup
    - /api/price-category — Kategori Penjualan
  - [Transaksi Penjualan](#22-transaksi-penjualan)
    - /api/sales-quotation — Penawaran Penjualan
    - /api/sales-order — Pesanan Penjualan
    - /api/delivery-order — Pengiriman Pesanan
    - /api/sales-invoice — Faktur Penjualan
    - /api/sales-receipt — Penerimaan Penjualan
    - /api/sales-return — Retur Penjualan
    - /api/exchange-invoice — Tukar Faktur
  - [Transaksi Pembelian](#23-transaksi-pembelian)
    - /api/purchase-requisition — Permintaan Barang
    - /api/purchase-order — Pesanan Pembelian
    - /api/receive-item — Penerimaan Barang
    - /api/purchase-invoice — Faktur Pembelian
    - /api/purchase-payment — Pembayaran Pembelian
    - /api/purchase-return — Retur Pembelian
  - [Kas & Bank](#24-kas--bank)
    - /api/other-deposit — Penerimaan
    - /api/other-payment — Pembayaran
    - /api/bank-transfer — Transfer Bank
  - [Persediaan](#25-persediaan)
    - /api/item-adjustment — Penyesuaian Persediaan
    - /api/item-transfer — Pemindahan Barang
    - /api/stock-opname-order — Perintah Stok Opname
    - /api/stock-opname-result — Hasil Stok Opname
    - /api/sellingprice-adjustment — Penyesuaian Harga/Diskon
    - /api/vendor-price — Harga Pemasok
  - [Produksi](#26-produksi)
    - /api/bill-of-material — Formula Produksi
    - /api/bom-process-category — Tahapan Produksi
    - /api/manufacture-order — Rencana Produksi
    - /api/work-order — Perintah Kerja
    - /api/finished-good-slip — Penyelesaian Barang Jadi
    - /api/material-slip — Pengambilan Bahan Baku
    - /api/material-adjustment — Penambahan Bahan Baku
    - /api/process-stages — Tahapan Proses
    - /api/wo-pic — Penanggung Jawab
    - /api/roll-over — Penyelesaian Pesanan
    - /api/standard-product-cost — Standar Biaya Produksi
  - [Akuntansi](#27-akuntansi)
    - /api/journal-voucher — Jurnal Umum
    - /api/expense — Pencatatan Beban
    - /api/fixed-asset — Aset Tetap
  - [Laporan & POS](#28-laporan--pos)
    - /api/report
    - /api/pos/customer
    - /api/pos/item
    - /api/pos/transaction
  - [Lainnya](#29-lainnya)
    - /api/sales-checkin — Check In
    - /api/salesman-commission — Komisi Penjual
- [3. Tipe Data Umum](#3-tipe-data-umum)
- [4. Konvensi Filter](#4-konvensi-filter)
- [5. Enumerasi Penting](#5-enumerasi-penting)

---

## Ringkasan Endpoint

### Base URL

| API | Base URL |
|-----|----------|
| API Dasar (Nucleus) | `https://account.accurate.id` |
| API Accurate | `https://xyz.accurate.id/accurate` |

Ganti `xyz` dengan subdomain perusahaan Anda.

### Otorisasi

API ini menggunakan OAuth 2.0. Setiap endpoint memiliki scope tertentu (contoh: `customer_view`, `customer_save`).

Session ID didapat dari response saat memanggil API `/api/open-db.do`.

### Parameter

- Parameter dikirim sebagai query string (GET) atau request body (POST)
- Parameter tipe object (complex) dikirim sebagai nested parameter dengan prefix `data[n].field`
- Untuk bulk-save, gunakan index array: `data[0].field`, `data[1].field`, dst.
- Pagination menggunakan parameter `sp` (SortPaging)

---

## 1. API Dasar (Nucleus)

### 1.1 Endpoint: /api

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| approved-scope | GET | Daftar scope OAuth2 yang telah disetujui |
| auth-info | GET | Informasi pengguna dari token yang digunakan |
| db-check-session | GET | Memeriksa apakah Data Usaha session masih dapat digunakan |
| db-detail | GET | Detil informasi database |
| db-list | GET | Daftar data usaha yang dapat diakses |
| db-refresh-session | GET | Memeriksa dan mengganti Data Usaha session |
| db-status | GET | Memeriksa status database |
| open-db | GET | Mengakses database |
| userinfo | GET | Informasi OAuth2 Claim dari pengguna |
| webhook-history | GET | Menampilkan daftar data pengiriman webhook (1 bulan terakhir) |
| webhook-renew | GET | Memperpanjang lama aktif webhook |

---

## 2. API Accurate

### 2.1 Master Data

#### /api/customer — Pelanggan

Scope: `customer_view`, `customer_save`, `customer_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pelanggan berdasarkan id atau customerNo |
| list | GET | Melihat daftar data Pelanggan, dengan filter yang sesuai |
| save | POST | Membuat data Pelanggan baru atau mengedit yang sudah ada |
| bulk-save | POST | Membuat/mengedit beberapa data Pelanggan sekaligus (max 100) |
| delete | DELETE | Menghapus data Pelanggan berdasarkan id atau customerNo |

**Parameter list.do:**

| Parameter | Tipe | Required | Deskripsi |
|-----------|------|----------|-----------|
| X-Session-ID | String | Tidak | Session ID (OAuth) |
| fields | String | Tidak | Field yang ingin ditampilkan (dipisah koma) |
| filter | ApiFilter | Tidak | Filter lanjutan |
| keywords | String | Tidak | Kata kunci pencarian |
| lastUpdateFilter | String | Tidak | Filter waktu perubahan data |
| npwpNo | String | Tidak | Filter nomor NPWP |
| sp | SortPaging | Tidak | Pengaturan halaman dan urutan |
| suspendedFilter | Boolean | Tidak | Filter status non aktif |
| wpNumber | String | Tidak | Filter nomor wajib pajak |

**Parameter save.do (CustomerParam$Parameter):**
Parameter utama: `name` (required), `transDate` (required), dan banyak parameter opsional seperti `customerNo`, `billStreet`, `billCity`, `billProvince`, `billCountry`, `billZipCode`, `shipStreet`, `shipCity`, `shipProvince`, `shipCountry`, `shipZipCode`, `taxStreet`, `taxCity`, `taxProvince`, `taxCountry`, `taxZipCode`, `phone`, `mobilePhone`, `fax`, `email`, `website`, `categoryName`, `termName`, `currencyCode`, `description`, `notes`, `salesmanNumber`, `salesmanListNumber`, `npwpNo`, `pkpNo`, `wpNumber`, `wpName`, `wpType`, `nitku`, `defaultIncTax`, `defaultSalesDisc`, `discountCategoryName`, `priceCategoryName`, `customerLimitAge`, `customerLimitAgeValue`, `customerLimitAmount`, `customerLimitAmountValue`, `salesAccountNo`, `salesDiscountAccountNo`, `salesReturnAccountNo`, `costOfGoodsSoldAccountNo`, `itemDiscountAccountNo`, `customerReceivableAccountListNo`, `customerDownPaymentAccountListNo`, `customerTaxType`, `documentCode`, `documentTransaction`, `notesIdTax`, `consignmentStore`, `detailContact`, `detailShipAddress`, `detailOpenBalance`.

---

#### /api/item — Barang & Jasa

Scope: `item_view`, `item_save`, `item_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Barang & Jasa berdasarkan id atau no |
| list | GET | Melihat daftar data Barang & Jasa |
| save | POST | Membuat/mengedit data Barang & Jasa |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Barang & Jasa berdasarkan id atau no |
| get-stock | GET | Mengambil jumlah barang yang tersedia |
| get-selling-price | GET | Melihat harga dan diskon barang |
| get-nearest-cost | GET | Melihat HPP barang pada tanggal tertentu |
| list-stock | GET | Melihat daftar jumlah barang yang tersedia |
| stock-mutation-history | GET | Melihat histori mutasi stok (7 hari terakhir) |
| vendor-price | GET | Melihat harga beli terakhir dari suatu pemasok |
| search-by-no-upc | GET | Mencari barang berdasarkan kode atau barcode |
| search-by-item-or-sn | GET | Mencari barang berdasarkan kode atau nomor seri |

**Parameter ItemParam$Parameter (save.do):**
Parameter utama: `name` (required), `itemCategoryName` (required), `itemType` (required), `unit1Name` (required), `no`, `unitPrice`, `unit2Name`, `unit2Price`, `unit3Name`, `unit3Price`, `unit4Name`, `unit4Price`, `unit5Name`, `unit5Price`, `preferedVendorName`, `itemCategoryName`, `notes`, `upcNo`, `weight`, `dimDepth`, `dimWidth`, `dimHeight`, `minimumQuantity`, `minimumQuantityReorder`, `substituted`, `substitutedItemNo`, `defaultDiscount`, `controlQuantity`, `usePpn`, `useWholesalePrice`, `manageSN`, `manageExpired`, `serialNumberType`, `calculateGroupPrice`, `printDetailGroup`, `percentTaxable`, `vendorPrice`, `vendorUnitName`, `ratio2`, `ratio3`, `ratio4`, `ratio5`, `salesGlAccountNo`, `salesDiscountGlAccountNo`, `salesRetGlAccountNo`, `cogsGlAccountNo`, `inventoryGlAccountNo`, `purchaseRetGlAccountNo`, `goodTransitGlAccountNo`, `unBilledGlAccountNo`, `tax1Name`, `tax2Name`, `tax3Name`, `tax4Name`, `detailGroup`, `detailOpenBalance`.

**ItemType enum:**
| Value | Deskripsi |
|-------|-----------|
| INVENTORY | Persediaan |
| NON_INVENTORY | Non Persediaan |
| SERVICE | Jasa |
| GROUP | Grup |
| PRODUCTION_COST | Biaya Produksi |

---

#### /api/vendor — Pemasok

Scope: `vendor_view`, `vendor_save`, `vendor_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pemasok berdasarkan id atau vendorNo |
| list | GET | Melihat daftar data Pemasok |
| save | POST | Membuat/mengedit data Pemasok |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pemasok berdasarkan id atau vendorNo |

---

#### /api/glaccount — Akun Perkiraan

Scope: `glaccount_view`, `glaccount_save`, `glaccount_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Akun Perkiraan |
| list | GET | Melihat daftar data Akun Perkiraan |
| save | POST | Membuat/mengedit data Akun Perkiraan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Akun Perkiraan |
| get-balance | GET | Melihat saldo akun per tanggal |
| get-bs-account-amount | GET | Melihat saldo akun Neraca per tanggal |
| get-pl-account-amount | GET | Melihat saldo akun Laba Rugi dalam periode |

---

#### /api/branch — Cabang

Scope: `branch_view`, `branch_save`, `branch_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Cabang berdasarkan id atau branchName |
| list | GET | Melihat daftar data Cabang |
| save | POST | Membuat/mengedit data Cabang |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Cabang berdasarkan id atau branchName |

---

#### /api/department — Departemen

Scope: `department_view`, `department_save`, `department_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Departemen |
| list | GET | Melihat daftar data Departemen |
| save | POST | Membuat/mengedit data Departemen |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Departemen |

---

#### /api/employee — Karyawan

Scope: `employee_view`, `employee_save`, `employee_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Karyawan |
| list | GET | Melihat daftar data Karyawan |
| save | POST | Membuat/mengedit data Karyawan |
| delete | DELETE | Menghapus data Karyawan |

---

#### /api/currency — Mata Uang

Scope: `currency_view`, `currency_save`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Mata Uang |
| list | GET | Melihat daftar data Mata Uang |
| save | POST | Membuat/mengedit data Mata Uang |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| exchange-rate | GET | Melihat histori kurs mata uang |
| fiscal-rate | GET | Melihat histori kurs pajak mata uang |

---

#### /api/unit — Satuan Barang

Scope: `unit_view`, `unit_save`, `unit_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Satuan Barang |
| list | GET | Melihat daftar data Satuan Barang |
| save | POST | Membuat/mengedit data Satuan Barang |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Satuan Barang |

---

#### /api/tax — Pajak

Scope: `tax_view`, `tax_save`, `tax_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pajak |
| list | GET | Melihat daftar data Pajak |
| save | POST | Membuat/mengedit data Pajak |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pajak |

---

#### /api/warehouse — Gudang

Scope: `warehouse_view`, `warehouse_save`, `warehouse_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Gudang |
| list | GET | Melihat daftar data Gudang |
| save | POST | Membuat/mengedit data Gudang |
| delete | DELETE | Menghapus data Gudang |

---

#### /api/project — Proyek

Scope: `project_view`, `project_save`, `project_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Proyek |
| list | GET | Melihat daftar data Proyek |
| save | POST | Membuat/mengedit data Proyek |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Proyek |

---

#### /api/payment-term — Syarat Pembayaran

Scope: `payment_term_view`, `payment_term_save`, `payment_term_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Syarat Pembayaran |
| list | GET | Melihat daftar data Syarat Pembayaran |
| save | POST | Membuat/mengedit data Syarat Pembayaran |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Syarat Pembayaran |

---

#### /api/data-classification — Kategori Keuangan

Scope: `data_classification_view`, `data_classification_save`, `data_classification_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| list | GET | Melihat daftar data Kategori Keuangan |
| save | POST | Membuat/mengedit data Kategori Keuangan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Kategori Keuangan |

---

### 2.2 Transaksi Penjualan

#### /api/sales-invoice — Faktur Penjualan

Scope: `sales_invoice_view`, `sales_invoice_save`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Faktur Penjualan |
| list | GET | Melihat daftar data Faktur Penjualan |
| save | POST | Membuat/mengedit data Faktur Penjualan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Faktur Penjualan |
| create-down-payment | POST | Membuat data Uang Muka Penjualan |
| detail-invoice | GET | Menampilkan faktur penjualan berdasarkan filter tertentu |

**Filter list.do:**
| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| approvalStatus | ApprovalStatusFilter | Status persetujuan |
| branchId | LongFilter | Cabang |
| branchName | String | Nama cabang |
| currencyId | LongFilter | Mata uang |
| customerId | LongFilter | Pelanggan |
| customerNo | String | Nomor identitas pelanggan |
| dueDate | DateFilter | Tanggal jatuh tempo |
| transDate | DateFilter | Tanggal transaksi |
| invoiceDp | Boolean | Uang muka penjualan |
| outstanding | Boolean | Status lunas |
| overdue | Boolean | Status jatuh tempo |
| reverseInvoice | Boolean | Faktur dimuka |
| keywords | String | Kata kunci |
| lastUpdate | TimestampFilter | Waktu perubahan |
| lastPaymentDate | DateFilter | Tanggal pembayaran terakhir |
| noneInvoiceReturn | Boolean | Faktur hasil retur tanpa faktur |
| openingBalance | Boolean | Saldo awal pelanggan |
| paymentTermId | LongFilter | Syarat pembayaran |
| shipDate | DateFilter | Tanggal pengiriman |
| availableDpAboveZero | Boolean | Uang muka tersedia > 0 |
| isAccuratePos | Boolean | Transaksi dari ACCURATE POS |
| reverseInvoiceStatus | ReverseInvoiceStatus | Status faktur dimuka |

**Parameter SalesInvoiceParam$Parameter (save.do):**
Parameter utama: `customerNo` (required), `detailItem` (required), `detailExpense` (required), `detailDownPayment` (required).
Parameter opsional: `branchId`, `branchName`, `transDate`, `number`, `description`, `currencyCode`, `rate`, `fiscalRate`, `taxable`, `inclusiveTax`, `taxDate`, `taxNumber`, `taxType`, `documentCode`, `documentTransaction`, `notesIdTax`, `paymentTermName`, `shipDate`, `shipmentName`, `fobName`, `toAddress`, `cashDiscount`, `cashDiscPercent`, `poNumber`, `invoiceDp`, `inputDownPayment`, `orderDownPaymentNumber`, `reverseInvoice`, `tax1Name`, `retailIdCard`, `retailWpNumber`, `retailWpName`, `retailWpType`, `retailIdTku`, `salesmanListNumber`.

**Parameter SalesInvoiceDetailParam$Parameter (detailItem):**
`itemNo` (required), `unitPrice` (required), `quantity`, `detailName`, `detailNotes`, `itemUnitName`, `itemDiscPercent`, `itemCashDiscount`, `warehouseName`, `salesOrderNumber`, `salesQuotationNumber`, `deliveryOrderNumber`, `serialNumber`, `useTax1`, `useTax2`, `useTax3`, `controlQuantity`, `departmentName`, `projectNo`, `dataClassification1Name` - `dataClassification10Name`, `detailSerialNumber`.

---

#### /api/sales-order — Pesanan Penjualan

Scope: `sales_order_view`, `sales_order_save`, `sales_order_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pesanan Penjualan |
| list | GET | Melihat daftar data Pesanan Penjualan |
| save | POST | Membuat/mengedit data Pesanan Penjualan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pesanan Penjualan |
| manual-close-order | POST | Menutup pesanan penjualan secara manual |

---

#### /api/delivery-order — Pengiriman Pesanan

Scope: `delivery_order_view`, `delivery_order_save`, `delivery_order_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pengiriman Pesanan |
| list | GET | Melihat daftar data Pengiriman Pesanan |
| save | POST | Membuat/mengedit data Pengiriman Pesanan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pengiriman Pesanan |

---

#### /api/sales-quotation — Penawaran Penjualan

Scope: `sales_quotation_view`, `sales_quotation_save`, `sales_quotation_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Penawaran Penjualan |
| list | GET | Melihat daftar data Penawaran Penjualan |
| save | POST | Membuat/mengedit data Penawaran Penjualan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Penawaran Penjualan |

---

#### /api/sales-receipt — Penerimaan Penjualan

Scope: `sales_receipt_view`, `sales_receipt_save`, `sales_receipt_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Penerimaan Penjualan |
| list | GET | Melihat daftar data Penerimaan Penjualan |
| save | POST | Membuat/mengedit data Penerimaan Penjualan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Penerimaan Penjualan |

---

#### /api/sales-return — Retur Penjualan

Scope: `sales_return_view`, `sales_return_save`, `sales_return_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Retur Penjualan |
| list | GET | Melihat daftar data Retur Penjualan |
| save | POST | Membuat/mengedit data Retur Penjualan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Retur Penjualan |

---

#### /api/exchange-invoice — Tukar Faktur

Scope: `exchange_invoice_view`, `exchange_invoice_save`, `exchange_invoice_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Tukar Faktur |
| list | GET | Melihat daftar data Tukar Faktur |
| save | POST | Membuat/mengedit data Tukar Faktur |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Tukar Faktur |

---

### 2.3 Transaksi Pembelian

#### /api/purchase-invoice — Faktur Pembelian

Scope: `purchase_invoice_view`, `purchase_invoice_save`, `purchase_invoice_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Faktur Pembelian |
| list | GET | Melihat daftar data Faktur Pembelian |
| save | POST | Membuat/mengedit data Faktur Pembelian |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Faktur Pembelian |
| create-down-payment | POST | Membuat data Uang Muka Pembelian |

**Filter PurchaseInvoiceDataAction$ApiFilter (list.do):**
| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| approvalStatus | ApprovalStatusFilter | Status persetujuan |
| branchId | LongFilter | Cabang |
| branchName | String | Nama cabang |
| currencyId | LongFilter | Mata uang |
| dueDate | DateFilter | Tanggal jatuh tempo |
| id | LongFilter | ID |
| invoiceDp | Boolean | Uang muka pembelian |
| keywords | String | Kata kunci |
| lastUpdate | TimestampFilter | Waktu perubahan |
| noneInvoiceReturn | Boolean | Faktur hasil retur tanpa faktur |
| number | String | Nomor |
| openingBalance | Boolean | Saldo awal pemasok |
| outstanding | Boolean | Status lunas |
| transDate | DateFilter | Tanggal transaksi |
| vendorId | LongFilter | Pemasok |
| vendorNo | String | Nomor identitas pemasok |

---

#### /api/purchase-order — Pesanan Pembelian

Scope: `purchase_order_view`, `purchase_order_save`, `purchase_order_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pesanan Pembelian |
| list | GET | Melihat daftar data Pesanan Pembelian |
| save | POST | Membuat/mengedit data Pesanan Pembelian |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pesanan Pembelian |
| manual-close-order | POST | Menutup pesanan pembelian secara manual |

---

#### /api/receive-item — Penerimaan Barang

Scope: `receive_item_view`, `receive_item_save`, `receive_item_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Penerimaan Barang |
| list | GET | Melihat daftar data Penerimaan Barang |
| save | POST | Membuat/mengedit data Penerimaan Barang |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Penerimaan Barang |

---

#### /api/purchase-payment — Pembayaran Pembelian

Scope: `purchase_payment_view`, `purchase_payment_save`, `purchase_payment_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pembayaran Pembelian |
| list | GET | Melihat daftar data Pembayaran Pembelian |
| save | POST | Membuat/mengedit data Pembayaran Pembelian |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pembayaran Pembelian |

---

#### /api/purchase-return — Retur Pembelian

Scope: `purchase_return_view`, `purchase_return_save`, `purchase_return_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Retur Pembelian |
| list | GET | Melihat daftar data Retur Pembelian |
| save | POST | Membuat/mengedit data Retur Pembelian |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Retur Pembelian |

---

#### /api/purchase-requisition — Permintaan Barang

Scope: `purchase_requisition_view`, `purchase_requisition_save`, `purchase_requisition_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Permintaan Barang |
| list | GET | Melihat daftar data Permintaan Barang |
| save | POST | Membuat/mengedit data Permintaan Barang |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Permintaan Barang |

---

### 2.4 Kas & Bank

#### /api/other-deposit — Penerimaan

Scope: `other_deposit_view`, `other_deposit_save`, `other_deposit_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Penerimaan |
| list | GET | Melihat daftar data Penerimaan |
| save | POST | Membuat/mengedit data Penerimaan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Penerimaan |

---

#### /api/other-payment — Pembayaran

Scope: `other_payment_view`, `other_payment_save`, `other_payment_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pembayaran |
| list | GET | Melihat daftar data Pembayaran |
| save | POST | Membuat/mengedit data Pembayaran |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pembayaran |

---

#### /api/bank-transfer — Transfer Bank

Scope: `bank_transfer_view`, `bank_transfer_save`, `bank_transfer_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Transfer Bank |
| list | GET | Melihat daftar data Transfer Bank |
| save | POST | Membuat/mengedit data Transfer Bank |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Transfer Bank |

---

### 2.5 Persediaan

#### /api/item-adjustment — Penyesuaian Persediaan

Scope: `item_adjustment_view`, `item_adjustment_save`, `item_adjustment_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Penyesuaian Persediaan |
| list | GET | Melihat daftar data Penyesuaian Persediaan |
| save | POST | Membuat/mengedit data Penyesuaian Persediaan |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Penyesuaian Persediaan |
| save-target-quantity | POST | Penyesuaian dengan kuantitas akhir yang diinginkan |

**ItemAdjustmentType enum:**
| Value | Deskripsi |
|-------|-----------|
| ADJUSTMENT_IN | Penambahan stok |
| ADJUSTMENT_OUT | Pengurangan stok |
| ADJUSTMENT_STOCK | Penyesuaian stok |

---

#### /api/item-transfer — Pemindahan Barang

Scope: `item_transfer_view`, `item_transfer_save`, `item_transfer_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pemindahan Barang |
| list | GET | Melihat daftar data Pemindahan Barang |
| save | POST | Membuat/mengedit data Pemindahan Barang |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pemindahan Barang |

**ItemTransferType enum:**
| Value | Deskripsi |
|-------|-----------|
| TRANSFER_OUT | Kirim Barang |
| TRANSFER_IN | Terima Barang |

---

#### /api/stock-opname-order — Perintah Stok Opname

Scope: `stock_opname_order_view`, `stock_opname_order_save`, `stock_opname_order_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Perintah Stok Opname |
| list | GET | Melihat daftar data Perintah Stok Opname |
| save | POST | Membuat/mengedit data Perintah Stok Opname |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Perintah Stok Opname |

---

#### /api/stock-opname-result — Hasil Stok Opname

Scope: `stock_opname_result_view`, `stock_opname_result_save`, `stock_opname_result_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Hasil Stok Opname |
| list | GET | Melihat daftar data Hasil Stok Opname |
| save | POST | Membuat/mengedit data Hasil Stok Opname |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Hasil Stok Opname |

---

#### /api/sellingprice-adjustment — Penyesuaian Harga/Diskon

Scope: `sellingprice_adjustment_view`, `sellingprice_adjustment_save`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Penyesuaian Harga/Diskon |
| list | GET | Melihat daftar data Penyesuaian Harga/Diskon |
| save | POST | Membuat/mengedit data Penyesuaian Harga/Diskon |
| delete | DELETE | Menghapus data Penyesuaian Harga/Diskon |

**SalesAdjustmentType enum:**
| Value | Deskripsi |
|-------|-----------|
| ITEM_PRICE_TYPE | Harga Jual |
| ITEM_DISCOUNT_TYPE | Diskon |

---

#### /api/vendor-price — Harga Pemasok

Scope: `vendor_price_view`, `vendor_price_save`, `vendor_price_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Harga Pemasok |
| list | GET | Melihat daftar data Harga Pemasok |
| save | POST | Membuat/mengedit data Harga Pemasok |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Harga Pemasok |

---

### 2.6 Produksi

#### /api/bill-of-material — Formula Produksi (BOM)

Scope: `bill_of_material_view`, `bill_of_material_save`, `bill_of_material_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Formula Produksi |
| list | GET | Melihat daftar data Formula Produksi |
| save | POST | Membuat/mengedit data Formula Produksi |
| delete | DELETE | Menghapus data Formula Produksi |

---

#### /api/work-order — Perintah Kerja

Scope: `work_order_view`, `work_order_save`, `work_order_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Perintah Kerja |
| list | GET | Melihat daftar data Perintah Kerja |
| save | POST | Membuat/mengedit data Perintah Kerja |
| delete | DELETE | Menghapus data Perintah Kerja |

---

#### /api/manufacture-order — Rencana Produksi

Scope: `manufacture_order_view`, `manufacture_order_save`, `manufacture_order_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Rencana Produksi |
| list | GET | Melihat daftar data Rencana Produksi |
| save | POST | Membuat/mengedit data Rencana Produksi |
| delete | DELETE | Menghapus data Rencana Produksi |

---

### 2.7 Akuntansi

#### /api/journal-voucher — Jurnal Umum

Scope: `journal_voucher_view`, `journal_voucher_save`, `journal_voucher_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Jurnal Umum |
| list | GET | Melihat daftar data Jurnal Umum |
| save | POST | Membuat/mengedit data Jurnal Umum |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Jurnal Umum |

---

#### /api/expense — Pencatatan Beban

Scope: `expense_accrual_view`, `expense_accrual_save`, `expense_accrual_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Pencatatan Beban |
| list | GET | Melihat daftar data Pencatatan Beban |
| save | POST | Membuat/mengedit data Pencatatan Beban |
| bulk-save | POST | Membuat/mengedit beberapa data sekaligus (max 100) |
| delete | DELETE | Menghapus data Pencatatan Beban |

---

#### /api/fixed-asset — Aset Tetap

Scope: `fixed_asset_view`, `fixed_asset_delete`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Aset Tetap |
| list | GET | Melihat daftar data Aset Tetap |
| delete | DELETE | Menghapus data Aset Tetap |

---

### 2.8 Laporan & POS

#### /api/report

| Action | HTTP | Scope | Deskripsi |
|--------|------|-------|-----------|
| serial-number-mutation | GET | stock_mutation_history_view | Riwayat nomor seri/produksi |
| serial-number-per-warehouse | GET | stock_mutation_history_view | Nomor seri per gudang |
| stock-mutation-summary | GET | stock_mutation_history_view | Ringkasan mutasi stok |
| work-order-detail | GET | work_order_view | Detail perintah kerja |

#### /api/pos/customer, /api/pos/item, /api/pos/transaction

Endpoint khusus POS untuk integrasi dengan sistem POS.

| Module | Action | HTTP | Deskripsi |
|--------|--------|------|-----------|
| /api/pos/customer | save | POST | Import/update pelanggan (upsert) |
| /api/pos/item | save | POST | Import/update barang (upsert) |
| /api/pos/transaction | save | POST | Import faktur + pembayaran + retur |

Scope `/api/pos/transaction`: `sales_invoice_save`, `sales_receipt_save`, `sales_return_save`

---

### 2.9 Lainnya

#### /api/sales-checkin — Check In

Scope: `sales_checkin_view`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| list | GET | Melihat daftar data Check In |
| detail | GET | Melihat detil data Check In |

#### /api/salesman-commission — Komisi Penjual

Scope: `salesman_commission_view`

| Action | HTTP | Deskripsi |
|--------|------|-----------|
| detail | GET | Melihat detil data Komisi Penjual |
| list | GET | Melihat daftar data Komisi Penjual |

---

## 3. Tipe Data Umum

| Tipe (Java) | Format | Contoh |
|-------------|--------|--------|
| java.lang.String | Teks | "Halo Semua 123" |
| java.lang.Long | Angka non-desimal | 1, 2, 3 |
| java.lang.Integer | Angka non-desimal | 1, 2, 3 |
| java.lang.Boolean | true / false | true |
| java.math.BigDecimal | Maks 999 miliar, 6 digit desimal | 95275.123456 |
| com.cpssoft.web.nucleus.core.orm.type.Money | Maks 999 miliar, 6 digit desimal | 95275.123456 |
| java.util.Date | Tanggal | 31/03/2016 |
| java.sql.Date | Tanggal | 31/03/2016 |
| java.sql.Timestamp | Tanggal + waktu | 31/03/2016 18:30:43 |

### SortPaging

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| page | Integer | Halaman data, mulai dari 1 |
| pageSize | Integer | Jumlah data per halaman. Default: 20 |
| sort | String | Format: `field:asc` atau `field:desc`. Multi: `name\|asc;no\|desc` |

---

## 4. Konvensi Filter

### Filter Values

| Tipe | Contoh | Keterangan |
|------|--------|------------|
| StringFilterValue | Format string | Filter teks |
| LongFilterValue | [50, 120, 150] | Filter ID |
| LongListFilterValue | [50, 120, 150] | Filter list ID |
| LookupFilterValue | [{"id":50}, {"id":120}] | Filter lookup |
| DateFilterValue | Format tanggal | Filter tanggal |
| BooleanFilterValue | true / false | Filter boolean |
| StringListFilterValue | ["XXX", "YYY"] | Filter list string |

### Filter Object (untuk ApiFilter)

Setiap filter memiliki format `{ "op": "EQUAL", "val": [...] }`.

| Operator | Deskripsi |
|----------|-----------|
| EQUAL | Sama dengan (default) |
| NOT_EQUAL | Tidak sama dengan |
| GREATER_THAN | Lebih besar |
| GREATER_EQUAL_THAN | Lebih besar atau sama |
| LESS_THAN | Lebih kecil |
| LESS_EQUAL_THAN | Lebih kecil atau sama |
| BETWEEN | Diantara (inklusif) |
| NOT_BETWEEN | Tidak diantara |
| CONTAIN | Mengandung teks (StringFilterOperator) |
| EMPTY | Data kosong |
| NOT_EMPTY | Data tidak kosong |

---

## 5. Enumerasi Penting

### CustomerTaxType (Tipe Pajak Pelanggan)

Digunakan di parameter `customerTaxType` pada customer dan `taxType` pada sales-invoice.

| Value | Deskripsi |
|-------|-----------|
| CTAS_KEPADA_SELAIN_PEMUNGUT_PPN | 01 - kepada selain Pemungut PPN |
| CTAS_KEPADA_PEMUNGUT_PPN_INSTANSI_PEMERINTAH | 02 - kepada Pemungut PPN Instansi Pemerintah |
| CTAS_KEPADA_PEMUNGUT_PPN_SELAIN_INSTANSI_PEMERINTAH | 03 - kepada Pemungut PPN selain Instansi Pemerintah |
| CTAS_DPP_NILAI_LAIN | 04 - DPP Nilai Lain |
| CTAS_BESARAN_TERTENTU | 05 - Besaran tertentu |
| CTAS_KEPADA_ORANG_PRIBADI_PEMEGANG_PASPOR_LUAR_NEGERI | 06 - kepada orang pribadi pemegang paspor luar negeri |
| CTAS_PENYERAHAN_DENGAN_FASILITAS_TIDAK_DIPUNGUT | 07 - penyerahan dengan fasilitas tidak dipungut |
| CTAS_PENYERAHAN_DENGAN_FASILITAS_DIBEBASKAN | 08 - penyerahan dengan fasilitas dibebaskan |
| CTAS_PENYERAHAN_AKTIVA_TIDAK_DIPERJUALBELIKAN | 09 - penyerahan aktiva (16D UU PPN) |
| CTAS_PENYERAHAN_LAINNYA | 10 - Penyerahan lainnya |
| CTAS_EKSPOR_BARANG_BERWUJUD | 01 - Ekspor Barang Berwujud |
| CTAS_EKSPOR_BARANG_TIDAK_BERWUJUD | 02 - Ekspor Barang Tidak Berwujud |
| CTAS_EKSPOR_JASA | 03 - Ekspor Jasa |

### VendorTaxType (Tipe Pajak Pemasok)

Digunakan di parameter `vendorTaxType` pada vendor dan purchase-invoice.

| Value | Deskripsi |
|-------|-----------|
| CTAS_KEPADA_SELAIN_PEMUNGUT_PPN | 01 - kepada selain Pemungut PPN |
| CTAS_KEPADA_PEMUNGUT_PPN_INSTANSI_PEMERINTAH | 02 - kepada Pemungut PPN Instansi Pemerintah |
| CTAS_KEPADA_PEMUNGUT_PPN_SELAIN_INSTANSI_PEMERINTAH | 03 - kepada Pemungut PPN selain Instansi Pemerintah |
| CTAS_DPP_NILAI_LAIN | 04 - DPP Nilai Lain |
| CTAS_BESARAN_TERTENTU | 05 - Besaran tertentu |
| CTAS_KEPADA_ORANG_PRIBADI_PEMEGANG_PASPOR_LUAR_NEGERI | 06 - kepada orang pribadi pemegang paspor luar negeri |
| CTAS_PENYERAHAN_DENGAN_FASILITAS_TIDAK_DIPUNGUT | 07 - penyerahan dengan fasilitas tidak dipungut |
| CTAS_PENYERAHAN_DENGAN_FASILITAS_DIBEBASKAN | 08 - penyerahan dengan fasilitas dibebaskan |
| CTAS_PENYERAHAN_AKTIVA_TIDAK_DIPERJUALBELIKAN | 09 - penyerahan aktiva (16D UU PPN) |
| CTAS_PENYERAHAN_LAINNYA | 10 - Penyerahan lainnya |
| CTAS_IMPOR_BARANG_KENA_PAJAK | 01 - Impor Barang Kena Pajak |
| CTAS_PEMANFAATAN_BARANG_TIDAK_BERWUJUD_DAN_JASA_KENA_PAJAK | 02 - Pemanfaatan BKP Tidak Berwujud dan JKP |

### GlAccountType (Jenis Akun Perkiraan)

| Value | Deskripsi |
|-------|-----------|
| CASH_BANK | Kas & Bank |
| ACCOUNT_RECEIVABLE | Piutang |
| INVENTORY | Persediaan |
| OTHER_CURRENT_ASSET | Aset Lancar Lainnya |
| FIXED_ASSET | Aset Tetap |
| ACCUMULATED_DEPRECIATION | Akumulasi Penyusutan |
| OTHER_ASSET | Aset Lainnya |
| ACCOUNT_PAYABLE | Utang |
| OTHER_CURRENT_LIABILITY | Utang Lancar Lainnya |
| LONG_TERM_LIABILITY | Utang Jangka Panjang |
| EQUITY | Modal |
| REVENUE | Pendapatan |
| COGS | HPP |
| EXPENSE | Beban |
| OTHER_INCOME | Pendapatan Lainnya |
| OTHER_EXPENSE | Beban Lainnya |

### ApprovalStatus (Status Persetujuan)

| Value | Deskripsi |
|-------|-----------|
| DRAFT | Draf |
| UNAPPROVED | Belum disetujui |
| APPROVED | Disetujui |
| REJECTED | Ditolak |
| NEXTUSER_TOAPPROVED | Menunggu persetujuan berikutnya |

### PaymentMethodType (Metode Pembayaran)

| Value | Deskripsi |
|-------|-----------|
| CASH_OTHER | Tunai |
| BANK_TRANSFER | Transfer Bank |
| BANK_CHEQUE | Cek |
| CREDIT_CARD | Kartu Kredit |
| DEBIT_CARD | Kartu Debit |
| E_WALLET | Dompet Elektronik |
| VIRTUAL_ACCOUNT | Virtual Account |
| QRIS | QRIS |
| EDC | EDC |
| PAYMENT_LINK | Payment Link |
| OTHERS | Lainnya |

### ItemType (Jenis Barang)

| Value | Deskripsi |
|-------|-----------|
| INVENTORY | Persediaan |
| NON_INVENTORY | Non Persediaan |
| SERVICE | Jasa |
| GROUP | Grup |
| PRODUCTION_COST | Biaya Produksi |

### SerialNumberType (Jenis Nomor Seri)

| Value | Deskripsi |
|-------|-----------|
| UNIQUE | Nomor seri unik |
| BATCH | Batch/Produksi |

### SalesReturnReturnType & PurchaseReturnReturnType (Tipe Retur)

| Value | Deskripsi |
|-------|-----------|
| INVOICE | Retur dari Faktur |
| DELIVERY / RECEIVE | Retur dari Pengiriman/Penerimaan |
| INVOICE_DP | Retur dari Uang Muka |
| NO_INVOICE | Retur tanpa Faktur |

### ReturnStatusType (Status Pengembalian Barang)

| Value | Deskripsi |
|-------|-----------|
| RETURNED | Barang dikembalikan, stok bertambah |
| PARTIALLY_RETURNED | Sebagian barang dikembalikan |
| NOT_RETURNED | Barang tidak dikembalikan, dibebankan ke biaya |

### SalesOrderStatus & PurchaseOrderStatus (Status Pesanan)

| Value | Deskripsi |
|-------|-----------|
| QUEUE | Antrian |
| WAITING | Menunggu |
| PROCEED / ONPROCESS | Diproses |
| CLOSED | Ditutup |
| FULLRECEIVED | Diterima semua (PO) |

### ContactSalutationType (Sapaan)

| Value | Deskripsi |
|-------|-----------|
| MR | Bapak |
| MRS | Ibu |

### DetailStateType (Status Detail)

| Value | Deskripsi |
|-------|-----------|
| delete | Hapus data terkait |

### TaxType (Tipe Pajak)

| Value | Deskripsi |
|-------|-----------|
| PPN | Pajak Pertambahan Nilai |
| PPNBM | Pajak Penjualan atas Barang Mewah |
| PPH23 | PPh Pasal 23 |
| PPHPS4 | PPh Pasal 4 ayat 2 |
| PPH21 | PPh Pasal 21 |
| PPH15 | PPh Pasal 15 |
| PPH22 | PPh Pasal 22 |

### DeliveryOrderStatus (Status Pengiriman)

| Value | Deskripsi |
|-------|-----------|
| SENT | Dikirim |
| PARTIAL_INVOICED | Sebagian sudah difaktur |
| INVOICED | Sudah difaktur |

---

## Catatan Penting

### Parameter `_status`
Untuk menghapus data detail dalam request save/bulk-save, gunakan `_status = "delete"`.

### Parameter `X-Session-ID`
Hanya dibutuhkan jika menggunakan metode otorisasi OAuth. Kode Session didapat dari response saat memanggil API `/api/open-db.do`.

### Pagination
Gunakan parameter `sp` (SortPaging) untuk mengatur halaman dan urutan data di semua endpoint list.

### Fields Parameter
Gunakan parameter `fields` untuk memilih field yang ingin ditampilkan, dipisahkan dengan koma. Contoh: `id, name, no`.

### Deprecated API
Beberapa API ditandai `deprecated: true` — artinya API tersebut sudah tidak direkomendasikan dan dapat dihapus sewaktu-waktu. Mohon segera migrasi ke API pengganti.

### Webhook
Webhook history bisa dicek via API Dasar `/api/webhook-history`. Tipe webhook yang tersedia:
- ITEM_QUANTITY, SALES_INVOICE_OWING, ITEM, SALES_ORDER, CUSTOMER, STOCK_MUTATION, GLACCOUNT, SALES_QUOTATION, DELIVERY_ORDER, SALES_INVOICE, SALES_RETURN, SALES_RECEIPT, ITEM_ADJUSTMENT, JOB_ORDER, ROLL_OVER, MATERIAL_ADJUSTMENT, WAREHOUSE, ITEM_TRANSFER, PURCHASE_ORDER, PURCHASE_REQUISITION, PURCHASE_INVOICE, PURCHASE_RETURN, RECEIVE_ITEM, PURCHASE_PAYMENT

---

## Referensi

Dokumen ini dibuat berdasarkan halaman dokumentasi resmi Accurate Online:
- https://account.accurate.id/developer/api-docs.do

Untuk informasi lebih lanjut tentang integrasi Accurate:
- `docs-v2/admin/integration-strategy.md` — Strategi integrasi multi-branch
- `docs-v2/admin/accurate-format.md` — Format export CSV/Excel dari Accurate Online