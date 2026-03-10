-- Create asset_history table to track all asset changes
CREATE TABLE IF NOT EXISTS public.asset_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL, -- 'location', 'status', 'value', etc.
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  movement_request_id UUID REFERENCES public.asset_movements(id) ON DELETE SET NULL,
  remarks TEXT
);

-- Create index for faster queries
CREATE INDEX idx_asset_history_asset_id ON public.asset_history(asset_id);
CREATE INDEX idx_asset_history_changed_at ON public.asset_history(changed_at DESC);
CREATE INDEX idx_asset_history_movement_request ON public.asset_history(movement_request_id);

-- Enable RLS
ALTER TABLE public.asset_history ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations for authenticated users" ON public.asset_history
  FOR ALL USING (true) WITH CHECK (true);
