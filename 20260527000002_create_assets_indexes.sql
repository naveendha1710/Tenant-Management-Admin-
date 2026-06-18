-- Migration: create targeted indexes for assets and analyze table
-- Date: 2026-05-27
-- Creates indexes requested by user and runs VACUUM ANALYZE.

-- 1. Latest created assets
CREATE INDEX IF NOT EXISTS idx_assets_created_at_desc
ON public.assets (created_at DESC);

-- 2. Latest updated assets
CREATE INDEX IF NOT EXISTS idx_assets_updated_at_desc
ON public.assets (updated_at DESC);

-- 3. Location filtering (building, floor, room)
CREATE INDEX IF NOT EXISTS idx_assets_location
ON public.assets (building, floor_id, room_id);

-- 4. Active + Working filtering
CREATE INDEX IF NOT EXISTS idx_assets_status_combo
ON public.assets (asset_status, status);

-- 5. Vendor + category filtering
CREATE INDEX IF NOT EXISTS idx_assets_vendor_category
ON public.assets (vendor_id, asset_category);

-- Recompute planner statistics for the assets table
VACUUM ANALYZE public.assets;

-- Recommendations (not executed here):
-- - Use keyset pagination in the app (e.g. WHERE asset_id > :cursor ORDER BY asset_id)
-- - Avoid large OFFSET queries on large tables
-- - After testing, drop any unused indexes to reduce write overhead
