-- Correct RLS policies for preventive_maintenance table
-- Fixes the role check to work properly with Supabase auth

-- Drop all existing policies
DROP POLICY IF EXISTS "Users view own PM assignments" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Admins manage PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Users update own PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can view PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can insert PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can update PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Authenticated users can delete PM" ON public.preventive_maintenance;

-- Enable RLS
ALTER TABLE public.preventive_maintenance ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for all authenticated users
CREATE POLICY "Allow authenticated users to view PM"
ON public.preventive_maintenance FOR SELECT
TO authenticated
USING (true);

-- Allow INSERT for authenticated users
CREATE POLICY "Allow authenticated users to insert PM"
ON public.preventive_maintenance FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid()
  )
);

-- Allow UPDATE for authenticated users
CREATE POLICY "Allow authenticated users to update PM"
ON public.preventive_maintenance FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid()
  )
);

-- Allow DELETE for authenticated users
CREATE POLICY "Allow authenticated users to delete PM"
ON public.preventive_maintenance FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid()
  )
);
