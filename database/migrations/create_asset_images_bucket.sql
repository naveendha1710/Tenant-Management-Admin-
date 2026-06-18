-- Create asset_images bucket for storing asset images
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset_images', 'asset_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public uploads to asset_images bucket
CREATE POLICY "Allow public uploads to asset_images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'asset_images');

-- Policy: Allow public reads from asset_images bucket
CREATE POLICY "Allow public reads from asset_images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'asset_images');

-- Policy: Allow public updates to asset_images bucket
CREATE POLICY "Allow public updates to asset_images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'asset_images');

-- Policy: Allow public deletes from asset_images bucket
CREATE POLICY "Allow public deletes from asset_images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'asset_images');
