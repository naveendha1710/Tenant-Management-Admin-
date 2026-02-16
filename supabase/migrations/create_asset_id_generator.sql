-- Function to generate unique asset IDs
CREATE OR REPLACE FUNCTION generate_asset_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ID in format: AST-YYYYMMDD-XXXX (e.g., AST-20240115-0001)
    new_id := 'AST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM assets WHERE asset_id = new_id) INTO id_exists;
    
    -- Exit loop if ID is unique
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;
