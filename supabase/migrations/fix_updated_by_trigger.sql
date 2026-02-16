-- Fix trigger to set updated_by using public.users ID
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the public.users ID that matches the auth user
  SELECT id INTO current_user_id FROM public.users WHERE id = auth.uid();
  
  NEW.updated_by = current_user_id;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_updated_by ON assets;
CREATE TRIGGER trigger_set_updated_by
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();
