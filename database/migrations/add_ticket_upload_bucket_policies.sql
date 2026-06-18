-- RLS Policies for ticket_upload storage bucket (without Supabase Auth)

-- Allow anyone to upload files (using anon key)
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'ticket_upload');

-- Allow public read access to files
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ticket_upload');

-- Allow public updates
CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'ticket_upload');

-- Allow public deletes
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'ticket_upload');
