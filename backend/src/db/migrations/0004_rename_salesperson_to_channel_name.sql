-- Rename salesperson_name → channel_name di invoices dan channel_divisions
-- Kolom ini menyimpan nama channel penjualan (DC WEST, TOKOPEDIA, dst)
-- bukan nama individu tenaga penjual, sehingga penamaan channel_name lebih akurat.

ALTER TABLE invoices RENAME COLUMN salesperson_name TO channel_name;
ALTER TABLE channel_divisions RENAME COLUMN salesperson_name TO channel_name;
