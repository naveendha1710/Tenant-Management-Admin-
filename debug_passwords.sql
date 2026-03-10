-- Check if passwords are already hashed (they will be long bcrypt strings starting with $2)
-- If they are, we need to drop the trigger temporarily and reset passwords

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS hash_password_trigger ON public.users;

-- Check current password format
-- SELECT id, email, LEFT(password, 10) as password_preview, LENGTH(password) as password_length FROM public.users;

-- If passwords are already hashed (length ~60), reset them to plain text first
-- UPDATE public.users SET password = 'admin123' WHERE email = 'admin@rathinam.tec';
-- UPDATE public.users SET password = 'admin123' WHERE email = 'finance@rathinam.tec';

-- Recreate trigger
CREATE TRIGGER hash_password_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION hash_password();
