-- Add asset reference to maintenance tickets

-- Add asset_id column to maintenance_tickets
ALTER TABLE public.maintenance_tickets 
ADD COLUMN IF NOT EXISTS asset_id UUID,
ADD CONSTRAINT maintenance_tickets_asset_fkey 
  FOREIGN KEY (asset_id) 
  REFERENCES public.assets(id) 
  ON DELETE SET NULL;

-- Create junction table for multiple assets per ticket
CREATE TABLE IF NOT EXISTS public.ticket_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ticket_assets_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_assets_ticket_fkey FOREIGN KEY (ticket_id) REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  CONSTRAINT ticket_assets_asset_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE,
  CONSTRAINT ticket_assets_unique UNIQUE (ticket_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_assets_ticket ON public.ticket_assets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assets_asset ON public.ticket_assets(asset_id);
