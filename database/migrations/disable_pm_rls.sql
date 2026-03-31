-- Disable RLS for preventive_maintenance table
-- This is necessary because the app uses localStorage-based authentication
-- instead of Supabase Auth, so auth.uid() is always null

-- Drop all policies
DROP POLICY IF EXISTS "Users view own PM assignments" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Admins manage PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Users update own PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can view PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can insert PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can update PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can delete PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Allow authenticated users to view PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Allow authenticated users to insert PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Allow authenticated users to update PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Allow authenticated users to delete PM" ON public.preventive_maintenance;

-- Disable RLS
ALTER TABLE public.preventive_maintenance DISABLE ROW LEVEL SECURITY;
