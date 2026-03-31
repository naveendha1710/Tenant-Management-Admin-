-- Fix RLS policies for preventive_maintenance table
-- Allow authenticated users to manage PM records

-- Drop existing policies
DROP POLICY IF EXISTS "Users view own PM assignments" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Admins manage PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Users update own PM" ON public.preventive_maintenance;

-- Allow all authenticated users to view PM records
CREATE POLICY "Authenticated users can view PM"
ON public.preventive_maintenance FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert PM records
CREATE POLICY "Authenticated users can insert PM"
ON public.preventive_maintenance FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update PM records
CREATE POLICY "Authenticated users can update PM"
ON public.preventive_maintenance FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to delete PM records
CREATE POLICY "Authenticated users can delete PM"
ON public.preventive_maintenance FOR DELETE
TO authenticated
USING (true);
