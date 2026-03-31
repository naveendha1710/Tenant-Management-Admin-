-- Migrate floor data to floor_id column
-- This script copies the UUID from 'floor' column to 'floor_id' column with proper casting

UPDATE assets 
SET floor_id = floor::uuid 
WHERE floor IS NOT NULL AND floor_id IS NULL;

-- Verify the migration
SELECT 
    asset_id,
    building,
    floor as old_floor_column,
    floor_id as new_floor_id_column,
    CASE 
        WHEN floor::uuid = floor_id THEN 'MATCHED'
        WHEN floor IS NOT NULL AND floor_id IS NULL THEN 'NEEDS MIGRATION'
        ELSE 'OK'
    END as status
FROM assets
WHERE floor IS NOT NULL OR floor_id IS NOT NULL
LIMIT 20;
