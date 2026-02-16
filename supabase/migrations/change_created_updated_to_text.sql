-- Drop foreign key constraints
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_created_by_fkey;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_updated_by_fkey;

-- Change columns to text to store user names
ALTER TABLE assets ALTER COLUMN created_by TYPE TEXT USING (SELECT name FROM users WHERE users.id = created_by);
ALTER TABLE assets ALTER COLUMN updated_by TYPE TEXT USING (SELECT name FROM users WHERE users.id = updated_by);

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
