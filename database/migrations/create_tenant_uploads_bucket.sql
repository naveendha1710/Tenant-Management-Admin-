-- Migration: Create Tenant_uploads bucket and RLS policies
-- Description: New bucket structure for tenant ticket uploads with ticketing_files subfolder

-- Create the Tenant_uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('Tenant_uploads', 'Tenant_uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to Tenant_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from Tenant_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to Tenant_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from Tenant_uploads" ON storage.objects;

-- Create RLS policies for Tenant_uploads bucket
-- Note: Using 'public' role since custom authentication is used (not Supabase Auth)

-- Allow public uploads
CREATE POLICY "Allow public uploads to Tenant_uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'Tenant_uploads');

-- Allow public reads
CREATE POLICY "Allow public reads from Tenant_uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Tenant_uploads');

-- Allow public updates
CREATE POLICY "Allow public updates to Tenant_uploads"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'Tenant_uploads');

-- Allow public deletes
CREATE POLICY "Allow public deletes from Tenant_uploads"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'Tenant_uploads');

-- Note: The bucket is set to public for uploads, but actual file access
-- is controlled through the backend proxy (/api/ticket-files) which validates
-- user authentication before serving files.
