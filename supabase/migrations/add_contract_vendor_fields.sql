-- Add contract and vendor_id fields to assets table
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS contract text DEFAULT 'No',
ADD COLUMN IF NOT EXISTS vendor_id uuid;

-- Add check constraint for contract field
ALTER TABLE public.assets
ADD CONSTRAINT assets_contract_check CHECK (
  contract = ANY (ARRAY['Yes'::text, 'No'::text])
);

-- Add foreign key for vendor_id
ALTER TABLE public.assets
ADD CONSTRAINT assets_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES auth.users (id);

-- Create index for vendor_id
CREATE INDEX IF NOT EXISTS idx_assets_vendor_id ON public.assets USING btree (vendor_id);
