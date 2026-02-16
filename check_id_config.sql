-- Check if id_config exists for assets
SELECT * FROM id_configs WHERE entity_type = 'asset';

-- If no config exists, insert a default one
INSERT INTO id_configs (entity_type, structure, separator, digits, start_value, is_active)
VALUES ('asset', 'cat-type-seq', '-', 3, 1, true)
ON CONFLICT DO NOTHING;

-- Sample structures:
-- 'cat-type-seq' = ITE-LAP-001
-- 'cat-year-seq' = ITE-2024-001
-- 'type-seq' = LAP-001
-- 'cat-seq' = ITE-001
-- 'year-seq' = 2024-001
-- 'seq-only' = 001
