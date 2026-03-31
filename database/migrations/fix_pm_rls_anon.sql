-- RLS policies for preventive_maintenance without auth.uid() dependency
-- Uses application-level security through created_by/updated_by fields

-- Drop all existing policies
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

-- Enable RLS
ALTER TABLE public.preventive_maintenance ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon role (your app uses anon key with custom auth)
CREATE POLICY "Allow anon access to PM"
ON public.preventive_maintenance
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Also allow authenticated role for future compatibility
CREATE POLICY "Allow authenticated access to PM"
ON public.preventive_maintenance
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
