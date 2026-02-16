-- Fix the audit trigger to match actual table schema
DROP TRIGGER IF EXISTS trigger_asset_audit ON assets;
DROP FUNCTION IF EXISTS log_asset_changes();

CREATE OR REPLACE FUNCTION log_asset_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO asset_audit_logs (
    asset_id,
    changed_by,
    field_name,
    old_value,
    new_value
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    'asset_update',
    OLD::text,
    NEW::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_asset_audit
AFTER INSERT OR UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION log_asset_changes();
