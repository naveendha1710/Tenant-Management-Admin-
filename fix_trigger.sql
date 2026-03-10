-- Check if trigger exists
-- SELECT * FROM pg_trigger WHERE tgname = 'hash_password_trigger';

-- Drop and recreate the hash function
DROP FUNCTION IF EXISTS hash_password() CASCADE;

CREATE OR REPLACE FUNCTION hash_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Only hash if password doesn't start with $2 (not already hashed)
  IF NEW.password IS NOT NULL AND NOT (NEW.password LIKE '$2%') THEN
    NEW.password = crypt(NEW.password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS hash_password_trigger ON public.users;
CREATE TRIGGER hash_password_trigger
  BEFORE INSERT OR UPDATE OF password ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION hash_password();

-- Now update passwords to trigger hashing
UPDATE public.users SET password = 'admin123';
