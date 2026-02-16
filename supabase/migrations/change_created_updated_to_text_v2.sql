-- Drop foreign key constraints
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_created_by_fkey;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_updated_by_fkey;

-- Add temporary columns
ALTER TABLE assets ADD COLUMN created_by_name TEXT;
ALTER TABLE assets ADD COLUMN updated_by_name TEXT;

-- Copy user names to temporary columns
UPDATE assets SET created_by_name = (SELECT name FROM users WHERE users.id = assets.created_by);
UPDATE assets SET updated_by_name = (SELECT name FROM users WHERE users.id = assets.updated_by);

-- Drop old columns and rename new ones
ALTER TABLE assets DROP COLUMN created_by;
ALTER TABLE assets DROP COLUMN updated_by;
ALTER TABLE assets RENAME COLUMN created_by_name TO created_by;
ALTER TABLE assets RENAME COLUMN updated_by_name TO updated_by;

-- Update trigger to set user name instead of ID
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
DECLARE
  current_user_name TEXT;
BEGIN
  SELECT name INTO current_user_name FROM public.users WHERE id = auth.uid();
  NEW.updated_by = current_user_name;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
