-- Final fix for PM RLS policies
-- This completely removes RLS restrictions for PM table

-- Disable RLS on preventive_maintenance table
ALTER TABLE public.preventive_maintenance DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users view own PM assignments" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Admins manage PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Users update own PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can view PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can insert PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can update PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can delete PM" ON public.preventive_maintenance;
