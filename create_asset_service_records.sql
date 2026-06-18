-- Drop existing table and related objects
DROP TRIGGER IF EXISTS trigger_update_asset_service_records_updated_at ON asset_service_records;
DROP FUNCTION IF EXISTS update_asset_service_records_updated_at();
DROP TABLE IF EXISTS asset_service_records CASCADE;

-- Create asset_service_records table
CREATE TABLE asset_service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id VARCHAR(255) NOT NULL,
  service_date DATE NOT NULL,
  service_type VARCHAR(100),
  service_provider VARCHAR(255),
  service_description TEXT,
  service_cost DECIMAL(15, 2),
  next_service_date DATE,
  performed_by VARCHAR(255),
  remarks TEXT,
  invoice_number VARCHAR(100),
  warranty_extended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- Create index for faster lookups
CREATE INDEX idx_asset_service_records_asset_id ON asset_service_records(asset_id);
CREATE INDEX idx_asset_service_records_service_date ON asset_service_records(service_date DESC);

-- Enable RLS
ALTER TABLE asset_service_records ENABLE ROW LEVEL SECURITY;

-- Create a single policy that allows all operations for everyone (including anon)
CREATE POLICY "Allow all access to service records"
  ON asset_service_records
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE FUNCTION update_asset_service_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asset_service_records_updated_at
  BEFORE UPDATE ON asset_service_records
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_service_records_updated_at();

-- Grant permissions to anon and authenticated roles
GRANT ALL ON asset_service_records TO anon;
GRANT ALL ON asset_service_records TO authenticated;
