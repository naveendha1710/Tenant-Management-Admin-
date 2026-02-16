-- Drop and recreate the audit trigger function without bond_type reference
DROP TRIGGER IF EXISTS trigger_asset_audit ON assets;
DROP FUNCTION IF EXISTS log_asset_changes();

CREATE OR REPLACE FUNCTION log_asset_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO asset_audit_logs (
    asset_id,
    changed_by,
    change_type,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_asset_audit
AFTER INSERT OR UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION log_asset_changes();
