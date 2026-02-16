-- Add depreciation tracking fields to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS last_depreciation_date DATE;

-- Add index for efficient depreciation queries
CREATE INDEX IF NOT EXISTS idx_assets_depreciation 
ON assets(depreciation_date, last_depreciation_date) 
WHERE depreciation_date IS NOT NULL AND depreciation_percentage IS NOT NULL;
