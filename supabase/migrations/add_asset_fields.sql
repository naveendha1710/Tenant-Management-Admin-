-- Add new fields to assets table
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS manufacturer text,
ADD COLUMN IF NOT EXISTS asset_description text,
ADD COLUMN IF NOT EXISTS comments text,
ADD COLUMN IF NOT EXISTS pm_date date,
ADD COLUMN IF NOT EXISTS asset_incharge text,
ADD COLUMN IF NOT EXISTS asset_spec text,
ADD COLUMN IF NOT EXISTS asset_picture text,
ADD COLUMN IF NOT EXISTS purchase_date date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Working',
ADD COLUMN IF NOT EXISTS warranty_date date;

-- Add check constraint for status field
ALTER TABLE public.assets
ADD CONSTRAINT assets_status_check CHECK (
  status = ANY (ARRAY['Working'::text, 'Not Working'::text])
);

-- Create index for new status field
CREATE INDEX IF NOT EXISTS idx_assets_working_status ON public.assets USING btree (status);
