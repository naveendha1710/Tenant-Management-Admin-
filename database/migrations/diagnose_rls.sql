-- Diagnostic queries to check RLS and user authentication

-- 1. Check current authenticated user
SELECT auth.uid() as current_user_id;

-- 2. Check if user exists in users table
SELECT id, email, name, role 
FROM public.users 
WHERE id = auth.uid();

-- 3. Check current RLS policies on preventive_maintenance
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'preventive_maintenance';

-- 4. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'preventive_maintenance';

-- 5. Test insert permission
SELECT 
  auth.uid() as my_id,
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid()) as user_exists;
