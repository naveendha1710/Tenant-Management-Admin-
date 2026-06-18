-- Add update_history column to assets table to store multiple update records with timestamps
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS update_history JSONB DEFAULT '[]'::jsonb;

-- Add comment to the column
COMMENT ON COLUMN assets.update_history IS 'Array of update records with user and timestamp: [{"updated_by": "user_name", "updated_at": "timestamp"}]';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assets_update_history ON assets USING gin (update_history);

-- Create or replace function to automatically add update history entry
CREATE OR REPLACE FUNCTION add_asset_update_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add history if updated_by is set and it's an UPDATE operation
  IF TG_OP = 'UPDATE' AND NEW.updated_by IS NOT NULL THEN
    NEW.update_history = COALESCE(NEW.update_history, '[]'::jsonb) || 
      jsonb_build_object(
        'updated_by', NEW.updated_by,
        'updated_at', NEW.updated_at
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate update_history
DROP TRIGGER IF EXISTS trigger_add_asset_update_history ON assets;
CREATE TRIGGER trigger_add_asset_update_history
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION add_asset_update_history();

-- Migrate existing data (optional - adds current updated_by and updated_at to history)
UPDATE assets 
SET update_history = jsonb_build_array(
  jsonb_build_object(
    'updated_by', COALESCE(updated_by, created_by, 'System'),
    'updated_at', COALESCE(updated_at, created_at, NOW())
  )
)
WHERE update_history = '[]'::jsonb OR update_history IS NULL;
