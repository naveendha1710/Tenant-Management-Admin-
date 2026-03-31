-- Disable RLS for physical_audits table
-- This is necessary because the app uses localStorage-based authentication
-- instead of Supabase Auth, so auth.uid() is always null

-- Drop all policies
DROP POLICY IF EXISTS "Users view own audits" ON public.physical_audits;
DROP POLICY IF EXISTS "Admins view all audits" ON public.physical_audits;
DROP POLICY IF EXISTS "Users insert audits for assigned assets" ON public.physical_audits;
DROP POLICY IF EXISTS "Admins manage audits" ON public.physical_audits;
DROP POLICY IF EXISTS "Allow anon access to physical audits" ON public.physical_audits;
DROP POLICY IF EXISTS "Allow authenticated access to physical audits" ON public.physical_audits;

-- Disable RLS
ALTER TABLE public.physical_audits DISABLE ROW LEVEL SECURITY;
