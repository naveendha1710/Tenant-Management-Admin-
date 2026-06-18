-- Migration: Add 'Maintenance' to asset_status check constraint
-- This allows assets to have 'Maintenance' status when sent for maintenance

-- First, drop the existing constraint
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_status_check;

-- Recreate the constraint with all valid status values including 'Maintenance'
ALTER TABLE public.assets ADD CONSTRAINT assets_asset_status_check 
CHECK (asset_status IN ('Active', 'Disposed', 'Idle', 'Maintenance', 'Scrap', 'Under Repair'));

-- Verify the constraint was created successfully
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.assets'::regclass AND contype = 'c';
