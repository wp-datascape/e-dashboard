-- Migration: tambah kolom is_placeholder ke customers
-- Dipakai untuk mengecualikan customer dummy Accurate dari semua metrik

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false;

-- Tandai semua customer dummy yang sudah ada di DB
UPDATE customers
SET is_placeholder = true
WHERE UPPER(TRIM(customer_name)) IN (
  'PELANGGAN UMUM',
  'PELANGGAN ECERAN',
  'WALK IN',
  'WALK-IN',
  'WALK-IN CUSTOMER',
  'RETAIL',
  'RETAIL CUSTOMER',
  'CASH CUSTOMER',
  'GENERAL CUSTOMER'
);
