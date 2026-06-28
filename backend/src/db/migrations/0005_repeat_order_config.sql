-- Migration: tambah config repeat_order_target_pct
INSERT INTO business_configs (key, value, description)
VALUES (
  'repeat_order_target_pct',
  '80',
  'Target Repeat Order Rate M6 (%) — persentase minimum existing customer yang harus repeat order dalam 30 hari'
)
ON CONFLICT (key) DO NOTHING;
