-- ROLLBACK SCRIPT: Restore Original Users Table Structure

-- Drop RBAC tables
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- Drop RBAC functions
DROP FUNCTION IF EXISTS get_user_permissions(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Restore original users table structure
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'predefined',
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
  DROP COLUMN IF EXISTS avatar,
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS organization_name,
  DROP COLUMN IF EXISTS unit_number;

-- Set default role for existing users with NULL role
UPDATE public.users SET role = 'Super Admin' WHERE role IS NULL;
UPDATE public.users SET user_type = 'predefined' WHERE user_type IS NULL;
UPDATE public.users SET permissions = '[]'::jsonb WHERE permissions IS NULL;

-- Rename last_active_at back to last_login if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_active_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE public.users RENAME COLUMN last_active_at TO last_login;
  END IF;
END $$;

-- Ensure all required columns exist with correct defaults
ALTER TABLE public.users
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN user_type SET DEFAULT 'predefined',
  ALTER COLUMN user_type SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN two_factor_enabled SET DEFAULT false,
  ALTER COLUMN permissions SET DEFAULT '[]'::jsonb,
  ALTER COLUMN password SET DEFAULT 'admin123',
  ALTER COLUMN password SET NOT NULL,
  ALTER COLUMN is_approver SET DEFAULT false;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
