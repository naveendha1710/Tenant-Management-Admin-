-- Migration: Add support for multiple asset pictures
-- Change asset_picture column to asset_pictures to store JSON array of image URLs

-- Rename column and change type to text (will store JSON array)
ALTER TABLE assets 
  RENAME COLUMN asset_picture TO asset_pictures;

-- Update existing single images to JSON array format
UPDATE assets 
SET asset_pictures = CASE 
  WHEN asset_pictures IS NOT NULL AND asset_pictures != '' 
  THEN '["' || asset_pictures || '"]'::text
  ELSE NULL 
END
WHERE asset_pictures IS NOT NULL AND asset_pictures != '';

-- Add comment
COMMENT ON COLUMN assets.asset_pictures IS 'JSON array of asset image URLs';
