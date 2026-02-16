-- Add manual_asset_id field to assets table
-- This field stores a manually entered asset ID separate from the auto-generated asset_id

ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS manual_asset_id TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.assets.manual_asset_id IS 'Manually entered asset ID for custom identification (separate from auto-generated asset_id)';

-- Create index for searching by manual asset ID
CREATE INDEX IF NOT EXISTS idx_assets_manual_asset_id 
ON public.assets USING btree (manual_asset_id) 
TABLESPACE pg_default
WHERE manual_asset_id IS NOT NULL;
