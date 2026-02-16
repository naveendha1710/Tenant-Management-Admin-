-- Fix created_by and updated_by to reference public.users
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_created_by_fkey;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_updated_by_fkey;

ALTER TABLE assets 
ADD CONSTRAINT assets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE assets 
ADD CONSTRAINT assets_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES public.users(id);
