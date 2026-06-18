-- Add invoice_date column to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Add comment to the column
COMMENT ON COLUMN assets.invoice_date IS 'Date of the invoice for the asset purchase';

-- Create index for better query performance on invoice_date
CREATE INDEX IF NOT EXISTS idx_assets_invoice_date ON assets(invoice_date);
