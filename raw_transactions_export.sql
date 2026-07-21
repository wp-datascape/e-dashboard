-- =====================================================================
-- Raw Transaction Export: Jan-Jun 2025 & Jan-Jun 2026
-- =====================================================================
-- Data mentah per line item invoice (belum diagregasi) — 1 baris = 1 produk
-- dalam 1 faktur. Jalankan QUERY A, B, C terpisah di Navicat, lalu
-- masing-masing export result grid-nya ke file Excel sendiri:
--   QUERY A -> transaksi_2025_H1.xlsx
--   QUERY B -> transaksi_2026_H1.xlsx
--   QUERY C -> retention_2025_vs_2026.xlsx (perbandingan langsung, sudah gabung 2 periode)
--
-- Ganti/hapus baris "AND i.company_id = 1" sesuai kebutuhan.

-- ---------------------------------------------------------------------
-- QUERY A: Semua transaksi Jan-Jun 2025
-- ---------------------------------------------------------------------
SELECT
    i.invoice_number,
    i.invoice_date,
    c.customer_code,
    c.customer_name,
    c.business_unit,
    i.branch_name,
    i.channel_name,
    p.product_name,
    pc.name AS product_category,
    ii.quantity,
    ii.unit_price,
    ii.revenue,
    ii.gross_profit,
    i.total_revenue AS total_invoice,
    i.total_gp AS total_gp_invoice
FROM invoices i
JOIN customers c ON c.id = i.customer_id
JOIN invoice_items ii ON ii.invoice_id = i.id
JOIN products p ON p.id = ii.product_id
LEFT JOIN product_categories pc ON pc.id = ii.product_category_id
WHERE i.deleted_at IS NULL
  -- AND i.company_id = 1   -- opsional: filter per company
  AND i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30'
ORDER BY i.invoice_date, i.invoice_number;


-- ---------------------------------------------------------------------
-- QUERY B: Semua transaksi Jan-Jun 2026
-- ---------------------------------------------------------------------
SELECT
    i.invoice_number,
    i.invoice_date,
    c.customer_code,
    c.customer_name,
    c.business_unit,
    i.branch_name,
    i.channel_name,
    p.product_name,
    pc.name AS product_category,
    ii.quantity,
    ii.unit_price,
    ii.revenue,
    ii.gross_profit,
    i.total_revenue AS total_invoice,
    i.total_gp AS total_gp_invoice
FROM invoices i
JOIN customers c ON c.id = i.customer_id
JOIN invoice_items ii ON ii.invoice_id = i.id
JOIN products p ON p.id = ii.product_id
LEFT JOIN product_categories pc ON pc.id = ii.product_category_id
WHERE i.deleted_at IS NULL
  -- AND i.company_id = 1   -- opsional: filter per company
  AND i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30'
ORDER BY i.invoice_date, i.invoice_number;


-- ---------------------------------------------------------------------
-- QUERY C: Ringkasan retention per customer per produk (2025 H1 vs 2026 H1)
-- Sudah gabung 2 periode dalam 1 baris — langsung kelihatan Retained/Churned/New
-- ---------------------------------------------------------------------
SELECT
    c.customer_code,
    c.customer_name,
    c.business_unit,
    STRING_AGG(DISTINCT i.branch_name, ', ') AS branch_name,
    STRING_AGG(DISTINCT i.channel_name, ', ') AS channel_name,
    p.product_name,
    pc.name AS product_category,
    MIN(i.invoice_date) AS tanggal_transaksi_pertama,
    MAX(i.invoice_date) AS tanggal_transaksi_terakhir,
    STRING_AGG(DISTINCT TO_CHAR(i.invoice_date, 'YYYY-MM'), ', ' ORDER BY TO_CHAR(i.invoice_date, 'YYYY-MM')) AS bulan_aktif,
    STRING_AGG(DISTINCT i.invoice_number, ', ' ORDER BY i.invoice_number) AS daftar_no_si,
    SUM(CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN ii.quantity ELSE 0 END) AS total_qty_2025_h1,
    SUM(CASE WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN ii.quantity ELSE 0 END) AS total_qty_2026_h1,
    SUM(CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN ii.revenue ELSE 0 END) AS total_2025_h1,
    SUM(CASE WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN ii.revenue ELSE 0 END) AS total_2026_h1,
    SUM(CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN ii.gross_profit ELSE 0 END) AS total_gp_2025_h1,
    SUM(CASE WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN ii.gross_profit ELSE 0 END) AS total_gp_2026_h1,
    COUNT(DISTINCT CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN i.id END) AS jumlah_transaksi_2025_h1,
    COUNT(DISTINCT CASE WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN i.id END) AS jumlah_transaksi_2026_h1,
    CASE
        WHEN SUM(CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN ii.revenue ELSE 0 END) > 0
         AND SUM(CASE WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN ii.revenue ELSE 0 END) > 0
        THEN 'Retained'
        WHEN SUM(CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN ii.revenue ELSE 0 END) > 0
        THEN 'Churned'
        ELSE 'New (2026 only)'
    END AS status_retention
FROM invoices i
JOIN customers c ON c.id = i.customer_id
JOIN invoice_items ii ON ii.invoice_id = i.id
JOIN products p ON p.id = ii.product_id
LEFT JOIN product_categories pc ON pc.id = ii.product_category_id
WHERE i.deleted_at IS NULL
  -- AND i.company_id = 1   -- opsional: filter per company
  AND (
        i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30'
        OR i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30'
      )
GROUP BY c.customer_code, c.customer_name, c.business_unit, p.product_name, pc.name
ORDER BY status_retention, total_2026_h1 DESC;
