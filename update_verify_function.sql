-- Drop existing function
DROP FUNCTION IF EXISTS verify_user_password(TEXT, TEXT);

-- Create simplified function that returns boolean
CREATE OR REPLACE FUNCTION verify_user_password(user_email TEXT, user_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_password TEXT;
BEGIN
  SELECT password INTO stored_password
  FROM public.users
  WHERE email = user_email;
  
  IF stored_password IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_password = crypt(user_password, stored_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
