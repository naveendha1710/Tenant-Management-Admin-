-- Verify if update_history column exists and has data
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'assets' 
  AND column_name = 'update_history';

-- Check sample data
SELECT 
  asset_id,
  updated_by,
  updated_at,
  update_history
FROM assets 
LIMIT 5;

-- Count assets with empty or null update_history
SELECT 
  COUNT(*) as total_assets,
  COUNT(CASE WHEN update_history IS NULL OR update_history = '[]'::jsonb THEN 1 END) as empty_history,
  COUNT(CASE WHEN update_history IS NOT NULL AND update_history != '[]'::jsonb THEN 1 END) as with_history
FROM assets;
