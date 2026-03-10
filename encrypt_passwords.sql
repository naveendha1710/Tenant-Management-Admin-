-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add new column for hashed password
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Migrate existing plain text passwords to hashed (bcrypt)
UPDATE public.users 
SET password_hash = crypt(password, gen_salt('bf'))
WHERE password_hash IS NULL;

-- Drop old plain text password column
ALTER TABLE public.users DROP COLUMN IF EXISTS password;

-- Rename password_hash to password
ALTER TABLE public.users RENAME COLUMN password_hash TO password;

-- Drop existing function first
DROP FUNCTION IF EXISTS verify_user_password(TEXT, TEXT);

-- Function to verify password (simplified)
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

-- Trigger to hash password on insert/update
CREATE OR REPLACE FUNCTION hash_password()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.password IS DISTINCT FROM OLD.password) THEN
    NEW.password = crypt(NEW.password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hash_password_trigger ON public.users;
CREATE TRIGGER hash_password_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION hash_password();
