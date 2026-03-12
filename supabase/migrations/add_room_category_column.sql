-- Add category_id column to rooms table to link with room categories
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.form_dropdowns(id) ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_rooms_category_id ON public.rooms USING btree (category_id);

-- Add comment to document the relationship
COMMENT ON COLUMN public.rooms.category_id IS 'References form_dropdowns.id where form_type = room_categories';