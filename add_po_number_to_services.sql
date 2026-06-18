-- Add PO Number column to asset_service_records table
ALTER TABLE asset_service_records 
ADD COLUMN IF NOT EXISTS po_number TEXT;

-- Add comment to the column
COMMENT ON COLUMN asset_service_records.po_number IS 'Purchase Order number for the service';
