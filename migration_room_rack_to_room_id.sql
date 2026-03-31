-- ============================================================================
-- Migration: Convert room_rack (TEXT) to room_id (UUID) with Foreign Key
-- ============================================================================
-- This script migrates the assets table from storing room names as text
-- to using UUID foreign keys that reference the rooms table.
-- ============================================================================

-- Step 1: Add new room_id column (nullable initially)
-- ============================================================================
ALTER TABLE assets 
ADD COLUMN room_id UUID;

-- Step 2: Create backup of current room_rack values
-- ============================================================================
ALTER TABLE assets 
ADD COLUMN room_rack_backup TEXT;

UPDATE assets 
SET room_rack_backup = room_rack;

-- Step 3: Migrate data - Match by room_number and floor_id
-- ============================================================================
-- This handles exact matches where both room name and floor match
UPDATE assets a
SET room_id = r.id
FROM rooms r
WHERE LOWER(TRIM(a.room_rack)) = LOWER(TRIM(r.room_number))
  AND a.floor_id = r.floor_id
  AND a.room_rack IS NOT NULL
  AND a.room_rack != '';

-- Step 4: Handle assets with NULL floor_id but valid room names
-- ============================================================================
-- Match by room name only when floor_id is NULL
-- This will pick the first matching room if multiple exist
UPDATE assets a
SET room_id = r.id
FROM rooms r
WHERE LOWER(TRIM(a.room_rack)) = LOWER(TRIM(r.room_number))
  AND a.floor_id IS NULL
  AND a.room_id IS NULL
  AND a.room_rack IS NOT NULL
  AND a.room_rack != ''
  AND r.id = (
    SELECT id 
    FROM rooms 
    WHERE LOWER(TRIM(room_number)) = LOWER(TRIM(a.room_rack))
    LIMIT 1
  );

-- Step 5: Handle case-insensitive variations and special cases
-- ============================================================================
-- Fix common variations like "Rcas Library" vs "Rcas library"
UPDATE assets a
SET room_id = r.id
FROM rooms r
WHERE a.room_id IS NULL
  AND a.room_rack IS NOT NULL
  AND a.room_rack != ''
  AND LOWER(TRIM(REPLACE(a.room_rack, '  ', ' '))) = LOWER(TRIM(REPLACE(r.room_number, '  ', ' ')))
  AND (a.floor_id = r.floor_id OR a.floor_id IS NULL);

-- Step 6: Generate migration report
-- ============================================================================
-- Create temporary table for migration analysis
CREATE TEMP TABLE migration_report AS
SELECT 
  'Total Assets' as category,
  COUNT(*) as count
FROM assets
UNION ALL
SELECT 
  'Assets with room_rack' as category,
  COUNT(*) as count
FROM assets
WHERE room_rack IS NOT NULL AND room_rack != ''
UNION ALL
SELECT 
  'Successfully Migrated' as category,
  COUNT(*) as count
FROM assets
WHERE room_id IS NOT NULL
UNION ALL
SELECT 
  'Failed Migration (room_rack exists but no room_id)' as category,
  COUNT(*) as count
FROM assets
WHERE (room_rack IS NOT NULL AND room_rack != '') 
  AND room_id IS NULL
UNION ALL
SELECT 
  'Assets without room_rack' as category,
  COUNT(*) as count
FROM assets
WHERE room_rack IS NULL OR room_rack = '';

-- Display migration report
SELECT * FROM migration_report ORDER BY category;

-- Step 7: Show unmigrated assets for manual review
-- ============================================================================
SELECT 
  asset_id,
  asset_name,
  room_rack,
  floor_id,
  building,
  'No matching room found' as reason
FROM assets
WHERE (room_rack IS NOT NULL AND room_rack != '')
  AND room_id IS NULL
ORDER BY room_rack, floor_id;

-- Step 8: Show room matching statistics
-- ============================================================================
SELECT 
  r.room_number,
  r.floor_id,
  COUNT(a.id) as asset_count
FROM rooms r
LEFT JOIN assets a ON a.room_id = r.id
GROUP BY r.room_number, r.floor_id
ORDER BY asset_count DESC, r.room_number;

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================
-- To rollback this migration, run:
-- UPDATE assets SET room_rack = room_rack_backup WHERE room_rack_backup IS NOT NULL;
-- ALTER TABLE assets DROP COLUMN room_id;
-- ALTER TABLE assets DROP COLUMN room_rack_backup;

-- ============================================================================
-- FINAL STEPS (Run after verifying migration)
-- ============================================================================
-- Uncomment and run these after confirming migration is successful:

-- 1. Add foreign key constraint
-- ALTER TABLE assets 
-- ADD CONSTRAINT fk_assets_room 
-- FOREIGN KEY (room_id) 
-- REFERENCES rooms(id) 
-- ON DELETE SET NULL 
-- ON UPDATE CASCADE;

-- 2. Create index for performance
-- CREATE INDEX idx_assets_room_id ON assets(room_id);

-- 3. Drop old room_rack column (ONLY after confirming everything works)
-- ALTER TABLE assets DROP COLUMN room_rack;

-- 4. Drop backup column
-- ALTER TABLE assets DROP COLUMN room_rack_backup;

-- ============================================================================
-- POST-MIGRATION APPLICATION CODE CHANGES REQUIRED
-- ============================================================================
-- 1. Update AssetMaster.tsx:
--    - Change room_rack field to room_id (UUID)
--    - Update RoomDisplay component to use room_id instead of room_rack
--    - Update form validation and submission logic
--
-- 2. Update AssetList.tsx:
--    - Update queries to join with rooms table using room_id
--    - Update display logic to show room information
--
-- 3. Update thermalPdfGenerator.ts:
--    - Update AssetForPrint interface to use room_id
--    - Join with rooms table to get room_number for labels
--
-- 4. Update all asset-related queries:
--    - Replace room_rack with room_id in SELECT, INSERT, UPDATE statements
--    - Add JOIN with rooms table where room name is needed
--
-- 5. Update asset creation/edit forms:
--    - Change room_rack input to room_id dropdown/select
--    - Populate dropdown from rooms table filtered by selected floor
--
-- 6. Add cascade handling:
--    - When room name changes in rooms table, it automatically reflects
--    - No need to update assets table manually
-- ============================================================================
