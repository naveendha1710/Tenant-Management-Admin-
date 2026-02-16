-- Create the inventory_items table with UNIQUE constraint on item_name
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL UNIQUE,
    category TEXT,
    stock_quantity INT NOT NULL DEFAULT 0,
    stock_threshold INT NOT NULL DEFAULT 5,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows maintenance and admin users to manage inventory
CREATE POLICY "Maintenance can manage inventory"
ON public.inventory_items
FOR ALL -- Allows SELECT, INSERT, UPDATE, DELETE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('maintenance', 'admin', 'super_admin')
);

-- Insert sample data
INSERT INTO public.inventory_items (item_name, category, stock_quantity, stock_threshold) VALUES
('HVAC Filters', 'HVAC', 15, 10),
('Pipe Fittings', 'Plumbing', 5, 8),
('LED Bulbs', 'Electrical', 25, 15),
('Cleaning Supplies', 'General', 3, 5),
('Door Handles', 'Hardware', 12, 6)
ON CONFLICT (item_name) DO NOTHING;