-- ============================================================================
-- Quick Fix: Migrate 7 Failed Assets (Typo Corrections)
-- ============================================================================

-- Fix 1: "Rcsa Library" → "Rcas Library" (6 assets)
-- ============================================================================
UPDATE assets a
SET room_id = r.id
FROM rooms r
WHERE a.room_rack = 'Rcsa Library'
  AND r.room_number = 'Rcas Library'
  AND a.floor_id = r.floor_id
  AND a.room_id IS NULL;

-- Fix 2: "Seminer/Clinical Room" → "Seminar /Clinical Room" (1 asset)
-- ============================================================================
UPDATE assets a
SET room_id = r.id
FROM rooms r
WHERE a.room_rack = 'Seminer/Clinical Room'
  AND r.room_number = 'Seminar /Clinical Room'
  AND a.floor_id = r.floor_id
  AND a.room_id IS NULL;

-- ============================================================================
-- Verification: Check if all assets are now migrated
-- ============================================================================
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
  'Failed Migration' as category,
  COUNT(*) as count
FROM assets
WHERE (room_rack IS NOT NULL AND room_rack != '')
  AND room_id IS NULL;

-- ============================================================================
-- Show any remaining failed assets (should be 0)
-- ============================================================================
SELECT 
  asset_id,
  asset_name,
  room_rack,
  floor_id
FROM assets
WHERE (room_rack IS NOT NULL AND room_rack != '')
  AND room_id IS NULL;

-- ============================================================================
-- Optional: Fix the typos in room_rack for consistency
-- ============================================================================
-- Uncomment if you want to correct the typos in room_rack column:

-- UPDATE assets 
-- SET room_rack = 'Rcas Library' 
-- WHERE room_rack = 'Rcsa Library';

-- UPDATE assets 
-- SET room_rack = 'Seminar /Clinical Room' 
-- WHERE room_rack = 'Seminer/Clinical Room';
