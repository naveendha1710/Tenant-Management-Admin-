-- Fix vendor_id foreign key to reference public.users instead of auth.users
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_vendor_id_fkey;

ALTER TABLE assets 
ADD CONSTRAINT assets_vendor_id_fkey 
FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE SET NULL;
