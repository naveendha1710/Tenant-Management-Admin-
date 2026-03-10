-- Multi-Branch Access Feature Migration
-- Run this script in your Supabase SQL Editor

-- 1. Add branch_access column to users table (if not exists)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS branch_access jsonb DEFAULT '[]'::jsonb;

-- 2. Create index for efficient branch access queries
CREATE INDEX IF NOT EXISTS idx_users_branch_access 
ON public.users USING gin (branch_access);

-- 3. Add comment for documentation
COMMENT ON COLUMN public.users.branch_access IS 
'Array of tenant IDs this user can access. Empty = no restriction. For Tenant role only.';

-- 4. Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'branch_access';
