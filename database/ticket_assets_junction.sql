-- Junction table for many-to-many relationship between maintenance tickets and assets
CREATE TABLE IF NOT EXISTS ticket_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticket_id, asset_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ticket_assets_ticket_id ON ticket_assets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assets_asset_id ON ticket_assets(asset_id);
