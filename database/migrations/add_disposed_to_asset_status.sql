-- Add 'Disposed' to asset_status check constraint
-- Migration: Add Disposed status to assets table

-- Drop existing constraint
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_status_check;

-- Add new constraint with 'Disposed' included
ALTER TABLE public.assets ADD CONSTRAINT assets_asset_status_check 
CHECK (
  asset_status = ANY (
    ARRAY[
      'Active'::text,
      'Idle'::text,
      'Repair'::text,
      'Scrap'::text,
      'Disposed'::text
    ]
  )
);
