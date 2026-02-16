-- Disable the audit trigger temporarily
DROP TRIGGER IF EXISTS trigger_asset_audit ON assets;
DROP FUNCTION IF EXISTS log_asset_changes();
