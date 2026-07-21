-- =====================================================================
-- Retention Analysis: Jan-Jun 2025 vs Jan-Jun 2026
-- =====================================================================
-- Ganti nilai company_id di WHERE clause sesuai kebutuhan
-- (kosongkan filter company_id kalau mau tarik semua company sekaligus)
--
-- Kategori produk diambil dari invoice_items.product_category_id (snapshot
-- kategori pada saat transaksi terjadi), bukan dari products.product_category_id
-- yang bisa berubah belakangan — konsisten dgn category-performance.repository.ts

-- ---------------------------------------------------------------------
-- QUERY 1: Total pembelian per customer per produk per semester
-- (dipakai untuk lihat frekuensi & konsistensi belanja / retention cohort)
-- ---------------------------------------------------------------------
SELECT
    CASE
        WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN '2025'
        WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN '2026'
    END AS periode_tahun,
    c.id AS customer_id,
    c.customer_code,
    c.customer_name,
    p.id AS product_id,
    p.product_name,
    pc.name AS product_category,
    COUNT(DISTINCT i.id) AS jumlah_transaksi,
    SUM(ii.quantity) AS total_qty,
    SUM(ii.revenue) AS total_pembelian
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
GROUP BY periode_tahun, c.id, c.customer_code, c.customer_name, p.id, p.product_name, pc.name
ORDER BY c.customer_name, periode_tahun, p.product_name;


-- ---------------------------------------------------------------------
-- QUERY 2: Quantity pembelian per customer per produk per semester
-- (dipakai untuk lihat produk apa yang bikin customer repeat/churn)
-- ---------------------------------------------------------------------
SELECT
    CASE
        WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN '2025'
        WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN '2026'
    END AS periode_tahun,
    c.id AS customer_id,
    c.customer_name,
    p.id AS product_id,
    p.product_name,
    pc.name AS product_category,
    SUM(ii.quantity) AS total_qty,
    SUM(ii.revenue) AS total_pembelian_produk
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
GROUP BY periode_tahun, c.id, c.customer_name, p.id, p.product_name, pc.name
ORDER BY c.customer_name, periode_tahun, p.product_name;


-- ---------------------------------------------------------------------
-- QUERY 3 (opsional): Ringkasan retention per customer per produk
-- Bandingkan langsung: belanja produk X di 2025 vs 2026, apakah customer
-- masih beli produk itu
-- ---------------------------------------------------------------------
SELECT
    c.id AS customer_id,
    c.customer_name,
    p.id AS product_id,
    p.product_name,
    pc.name AS product_category,
    SUM(CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN ii.revenue ELSE 0 END) AS total_2025,
    SUM(CASE WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN ii.revenue ELSE 0 END) AS total_2026,
    COUNT(DISTINCT CASE WHEN i.invoice_date BETWEEN '2025-01-01' AND '2025-06-30' THEN DATE_TRUNC('month', i.invoice_date) END) AS bulan_aktif_2025,
    COUNT(DISTINCT CASE WHEN i.invoice_date BETWEEN '2026-01-01' AND '2026-06-30' THEN DATE_TRUNC('month', i.invoice_date) END) AS bulan_aktif_2026,
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
GROUP BY c.id, c.customer_name, p.id, p.product_name, pc.name
ORDER BY status_retention, total_2026 DESC;
