-- Add asset_combination field to assets table to link with sub_subcategory_combinations
ALTER TABLE assets ADD COLUMN asset_combination UUID;

-- Add foreign key constraint to link with sub_subcategory_combinations table
ALTER TABLE assets ADD CONSTRAINT fk_assets_combination 
FOREIGN KEY (asset_combination) REFERENCES sub_subcategory_combinations(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_assets_combination ON assets(asset_combination);