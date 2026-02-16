CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    category TEXT,
    stock_quantity INT NOT NULL DEFAULT 0,
    stock_threshold INT NOT NULL DEFAULT 5,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.inventory_items IS 'Stores spare parts and supplies for maintenance.';

-- Insert sample data for demo
INSERT INTO public.inventory_items (item_name, category, stock_quantity, stock_threshold) VALUES
('HVAC Filters', 'HVAC', 15, 10),
('Pipe Fittings', 'Plumbing', 5, 8),
('LED Bulbs', 'Electrical', 25, 15),
('Cleaning Supplies', 'General', 3, 5),
('Door Handles', 'Hardware', 12, 6),
('Paint Cans', 'General', 8, 4),
('Electrical Wire', 'Electrical', 2, 10),
('Screws & Bolts', 'Hardware', 50, 20);