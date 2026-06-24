-- Seed data untuk item_classification_rules
-- Berdasarkan analisis data MKO dari accurate-fields-required.md

INSERT INTO item_classification_rules (company_id, match_type, match_pattern, item_type, priority, is_active)
VALUES
  -- Keyword Item Name rules (priority 100)
  (NULL, 'keyword_item_name', 'CARTRIDGE', 'consumable', 100, true),
  (NULL, 'keyword_item_name', 'INK ', 'consumable', 100, true),
  (NULL, 'keyword_item_name', 'RIBBON', 'consumable', 100, true),
  (NULL, 'keyword_item_name', 'TONER', 'consumable', 100, true),
  (NULL, 'keyword_item_name', 'PART ', 'sparepart', 100, true),
  (NULL, 'keyword_item_name', 'CABLE', 'sparepart', 100, true),
  (NULL, 'keyword_item_name', 'ADAPTOR', 'sparepart', 100, true),

  -- Keyword Category rules (priority 90)
  (NULL, 'keyword_category', 'PRINTER', 'unit', 90, true),
  (NULL, 'keyword_category', 'SCANNER', 'unit', 90, true),
  (NULL, 'keyword_category', 'MONEY COUNTER', 'unit', 90, true),
  (NULL, 'keyword_category', 'DISPLAY', 'unit', 90, true),
  (NULL, 'keyword_category', 'MONITOR', 'unit', 90, true),
  (NULL, 'keyword_category', 'SPARE PART', 'sparepart', 90, true),
  (NULL, 'keyword_category', 'CARTRIDGE', 'consumable', 90, true),

  -- Price Range rules (priority 10 — lowest, fallback if Layer 1+2 fails)
  (NULL, 'price_range', '{"min": 500000}', 'unit', 10, true),
  (NULL, 'price_range', '{"max": 50000}', 'sparepart', 10, true)

ON CONFLICT DO NOTHING;