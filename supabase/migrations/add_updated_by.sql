-- Add updated_by field to track who last modified the asset
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create trigger function to automatically set updated_by
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_updated_by ON assets;
CREATE TRIGGER trigger_set_updated_by
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();
